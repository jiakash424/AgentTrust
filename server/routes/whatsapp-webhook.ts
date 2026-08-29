import { Router } from "express";
import { prisma } from "../db";
import { metaWhatsAppCloudProvider } from "../providers/whatsapp/meta-cloud.provider";
import { activeBusinessContextService } from "../services/active-business-context.service";
import { getAIProvider } from "../providers/ai/index";
import { z } from "zod";

const router = Router();
const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "agenttrust_whatsapp_token";

// 1. GET /api/webhooks/whatsapp — Meta Webhook Verification
router.get("/", (req, res) => {
  const challenge = metaWhatsAppCloudProvider.verifyWebhook(
    req.query as Record<string, any>,
    VERIFY_TOKEN,
  );
  if (challenge) {
    console.log("✅ WhatsApp webhook verified by Meta!");
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden: Invalid verification token");
  }
});

// 2. POST /api/webhooks/whatsapp — Process Incoming Events
router.post("/", async (req, res) => {
  try {
    const events = metaWhatsAppCloudProvider.parseIncomingWebhook(req.body);

    for (const evt of events) {
      // Event A: Delivery/Read Status Updates
      if (evt.event === "status" && evt.providerMessageId) {
        const existing = await prisma.whatsAppMessage.findFirst({
          where: { providerMessageId: evt.providerMessageId },
        });

        if (existing) {
          const updateData: any = {
            status: evt.status?.toUpperCase() || "SENT",
            updatedAt: new Date(),
          };
          if (evt.status === "delivered") updateData.deliveredAt = new Date();
          if (evt.status === "read") updateData.readAt = new Date();

          await prisma.whatsAppMessage.update({
            where: { id: existing.id },
            data: updateData,
          });

          // Also update campaign counters if linked
          if (existing.campaignId) {
            const field =
              evt.status === "delivered"
                ? "deliveredCount"
                : evt.status === "read"
                  ? "readCount"
                  : null;
            if (field) {
              await prisma.whatsAppCampaign.update({
                where: { id: existing.campaignId },
                data: { [field]: { increment: 1 } },
              });
            }
          }
        }
      }

      // Event B: Customer Opt-Out Request
      if (evt.event === "opt_out" && evt.from) {
        const cleanPhone = evt.from.replace(/\D/g, "");
        // Find workspaces with matching leads
        const leads = await prisma.lead.findMany({
          where: { phone: { contains: cleanPhone } },
        });

        for (const lead of leads) {
          await prisma.whatsAppOptOut.upsert({
            where: {
              workspaceId_phone: {
                workspaceId: lead.workspaceId,
                phone: cleanPhone,
              },
            },
            update: { reason: evt.text || "STOP" },
            create: {
              workspaceId: lead.workspaceId,
              phone: cleanPhone,
              reason: evt.text || "STOP",
            },
          });

          await prisma.lead.update({
            where: { id: lead.id },
            data: { status: "REJECTED" },
          });
        }
      }

      // Event C: Customer Incoming Reply
      if (evt.event === "message" && evt.from && evt.text) {
        const cleanPhone = evt.from.replace(/\D/g, "");
        const lead = await prisma.lead.findFirst({
          where: { phone: { contains: cleanPhone } },
        });

        if (lead) {
          const workspaceId = lead.workspaceId;

          // 1. Create Inbound WhatsApp Message
          const inboundMessage = await prisma.whatsAppMessage.create({
            data: {
              workspaceId,
              leadId: lead.id,
              recipientPhone: cleanPhone,
              senderPhone: cleanPhone,
              direction: "INBOUND",
              messageType: "TEXT",
              content: evt.text,
              providerMessageId:
                evt.providerMessageId || `inbound_${Date.now()}`,
              status: "READ",
              sentAt: new Date(),
            },
          });

          // 2. Find or Create linked Conversation
          let conv = await prisma.conversation.findFirst({
            where: { workspaceId, title: { contains: lead.name } },
          });

          if (!conv) {
            conv = await prisma.conversation.create({
              data: {
                workspaceId,
                title: `WhatsApp: ${lead.name}`,
                summary: `Active WhatsApp inquiry from ${lead.name}`,
                selectedLeadIds: [lead.id],
              },
            });
          }

          // 3. Add message to Conversation
          await prisma.conversationMessage.create({
            data: {
              conversationId: conv.id,
              role: "user",
              direction: "INBOUND",
              content: evt.text,
              metadata: {
                channel: "WHATSAPP",
                whatsappMessageId: inboundMessage.id,
                phone: cleanPhone,
              },
            },
          });

          await prisma.conversation.update({
            where: { id: conv.id },
            data: {
              lastMessagePreview: `WhatsApp: ${evt.text.substring(0, 80)}`,
              lastMessageAt: new Date(),
              lastActivityAt: new Date(),
            },
          });

          // 4. AI Understands Intent & Suggests Next Action
          try {
            const activeCtx =
              await activeBusinessContextService.resolveContext(workspaceId);
            const ai = getAIProvider();

            const replySchema = z.object({
              intentSummary: z.string(),
              suggestedReplyText: z.string(),
              recommendedStageUpdate: z
                .enum(["QUALIFIED", "QUOTE_SENT", "NEGOTIATING", "WON", "LOST"])
                .optional(),
            });

            const aiAnalysis = await ai.structured(
              [
                {
                  role: "system",
                  content: `You are NOVA, an AI B2B Sales Assistant.
Analyze this customer's incoming WhatsApp reply for the business "${activeCtx.companyName}" (${activeCtx.industry}).
Merchant Products: ${JSON.stringify(activeCtx.products)}
Customer Reply: "${evt.text}"
Formulate a concise, polite, professional B2B follow-up WhatsApp reply to convert this lead.`,
                },
                {
                  role: "user",
                  content: `Customer "${lead.name}" sent: "${evt.text}". Draft the ideal follow-up reply.`,
                },
              ],
              replySchema,
            );

            // Add AI recommendation to conversation
            await prisma.conversationMessage.create({
              data: {
                conversationId: conv.id,
                role: "assistant",
                direction: "OUTBOUND",
                isSimulated: true,
                content: `🤖 **NOVA AI Intent Analysis**: ${aiAnalysis.intentSummary}\n\n**Suggested WhatsApp Reply**:\n"${aiAnalysis.suggestedReplyText}"`,
                metadata: {
                  channel: "WHATSAPP",
                  suggestedAction: "SEND_WHATSAPP_REPLY",
                  suggestedText: aiAnalysis.suggestedReplyText,
                  recommendedStage: aiAnalysis.recommendedStageUpdate,
                },
              },
            });

            // Update Deal stage if relevant
            const deal = await prisma.deal.findFirst({
              where: { leadId: lead.id },
            });
            if (deal && aiAnalysis.recommendedStageUpdate) {
              await prisma.deal.update({
                where: { id: deal.id },
                data: {
                  stage: aiAnalysis.recommendedStageUpdate,
                  recommendedNextAction: `WhatsApp Reply Received: ${aiAnalysis.intentSummary}`,
                },
              });
            }
          } catch (aiErr) {
            console.warn("AI Reply suggestion skipped:", aiErr);
          }
        }
      }
    }

    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    res.status(200).json({ status: "error", error: err.message });
  }
});

export default router;
