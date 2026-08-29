import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { activeBusinessContextService } from "../services/active-business-context.service";
import { businessAdaptationStrategyService } from "../services/business-adaptation-strategy.service";
import { metaWhatsAppCloudProvider } from "../providers/whatsapp/meta-cloud.provider";
import { getAIProvider } from "../providers/ai/index";
import { z } from "zod";

const router = Router();

// 1. GET /api/whatsapp/config — Fetch WhatsApp Connection Config
router.get("/config", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    let conn = await prisma.whatsAppConnection.findFirst({
      where: { workspaceId },
    });

    if (!conn) {
      conn = await prisma.whatsAppConnection.create({
        data: {
          workspaceId,
          status: "DEMO_MODE",
          mode: "DEMO",
          displayPhoneNumber: "+91 98765 43210 (Demo)",
        },
      });
    }

    res.json({
      connection: {
        id: conn.id,
        phoneNumberId: conn.phoneNumberId || "",
        wabaId: conn.wabaId || "",
        displayPhoneNumber: conn.displayPhoneNumber || "",
        status: conn.status,
        mode: conn.mode,
        lastTestedAt: conn.lastTestedAt,
        webhookUrl: `${req.protocol}://${req.get("host")}/api/webhooks/whatsapp`,
      },
    });
  } catch (err: any) {
    console.error("Failed to fetch WhatsApp config:", err);
    res.status(500).json({ error: "Failed to load WhatsApp configuration" });
  }
});

// 2. POST /api/whatsapp/config — Save Credentials & Test Connection
router.post("/config", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { phoneNumberId, wabaId, displayPhoneNumber, accessToken, mode } =
      req.body;

    const isDemo =
      mode === "DEMO" || (accessToken && accessToken.includes("demo"));
    const status = isDemo ? "DEMO_MODE" : "CONNECTED";

    const conn = await prisma.whatsAppConnection.upsert({
      where: {
        workspaceId_phoneNumberId: {
          workspaceId,
          phoneNumberId: phoneNumberId || "demo_phone_id",
        },
      },
      update: {
        wabaId: wabaId || null,
        displayPhoneNumber: displayPhoneNumber || null,
        encryptedToken: accessToken || null,
        status,
        mode: isDemo ? "DEMO" : "OFFICIAL_META",
        lastTestedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        phoneNumberId: phoneNumberId || "demo_phone_id",
        wabaId: wabaId || null,
        displayPhoneNumber: displayPhoneNumber || null,
        encryptedToken: accessToken || null,
        status,
        mode: isDemo ? "DEMO" : "OFFICIAL_META",
        lastTestedAt: new Date(),
      },
    });

    const testRes = await metaWhatsAppCloudProvider.testConnection({
      phoneNumberId: conn.phoneNumberId,
      accessToken: conn.encryptedToken,
    });

    res.json({
      success: true,
      connection: conn,
      testResult: testRes,
    });
  } catch (err: any) {
    console.error("Failed to save WhatsApp config:", err);
    res.status(500).json({ error: "Failed to update WhatsApp configuration" });
  }
});

// 3. POST /api/whatsapp/generate-draft — AI Personalization Generator
router.post("/generate-draft", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { leadId, contactName, companyName, phone, targetProductId } =
      req.body;

    const activeCtx =
      await activeBusinessContextService.resolveContext(workspaceId);

    let lead: any = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    const recipientName =
      contactName || lead?.name || companyName || "Valued Client";
    const recipientComp = companyName || lead?.name || "your enterprise";
    const recipientPhone = phone || lead?.phone || "+91 98765 43210";

    const ai = getAIProvider();

    const draftSchema = z.object({
      messageText: z.string(),
      personalizationReason: z.string(),
      suggestedTemplateName: z.string().optional(),
    });

    let draft: z.infer<typeof draftSchema>;

    try {
      draft = await ai.structured(
        [
          {
            role: "system",
            content: `You are NOVA, an AI B2B WhatsApp Sales Specialist for "${activeCtx.companyName}" (${activeCtx.industry}).
Products: ${JSON.stringify(activeCtx.products)}
Target Buyer Profiles: ${JSON.stringify(activeCtx.targetBuyerProfiles)}
Value Proposition: "${activeCtx.valueProposition}"

Generate a short, professional, highly contextual B2B WhatsApp outreach message.
Rules:
- Be concise, polite, and direct (max 4 lines).
- Introduce your business and highlight relevant bulk/wholesale supply.
- Include an open question Call to Action.
- Do NOT use spammy promotional language.`,
          },
          {
            role: "user",
            content: `Generate WhatsApp outreach message for recipient "${recipientName}" at company "${recipientComp}".`,
          },
        ],
        draftSchema,
      );
    } catch (aiErr: any) {
      const topProd = activeCtx.products[0] || "commercial commodities";
      draft = {
        messageText: `Hi ${recipientName}, I noticed ${recipientComp} operates in this commercial sector. At ${activeCtx.companyName}, we supply bulk ${topProd} with factory volume pricing. Would you be open to a brief discussion on your procurement requirements?`,
        personalizationReason: `Direct B2B supply proposal for ${topProd}`,
        suggestedTemplateName: "b2b_supply_inquiry",
      };
    }

    res.json({
      success: true,
      recipientName,
      recipientCompany: recipientComp,
      recipientPhone,
      messageText: draft.messageText,
      personalizationReason: draft.personalizationReason,
      suggestedTemplateName: draft.suggestedTemplateName,
    });
  } catch (err: any) {
    console.error("Failed to generate WhatsApp draft:", err);
    res.status(500).json({ error: "Failed to generate AI WhatsApp message" });
  }
});

// 4. POST /api/whatsapp/messages — Create Draft / Submit for Approval
router.post("/messages", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.userId;
    const {
      leadId,
      recipientPhone,
      content,
      templateName,
      templateVariables,
      submitForApproval,
    } = req.body;

    if (!recipientPhone || !content) {
      res
        .status(400)
        .json({
          error: "Recipient phone number and message content are required",
        });
      return;
    }

    const cleanPhone = recipientPhone.replace(/\D/g, "");

    // Opt-out check
    const optOut = await prisma.whatsAppOptOut.findUnique({
      where: { workspaceId_phone: { workspaceId, phone: cleanPhone } },
    });

    if (optOut) {
      res
        .status(400)
        .json({ error: "This recipient has opted out of WhatsApp messages." });
      return;
    }

    const status = submitForApproval ? "PENDING_APPROVAL" : "DRAFT";

    const msg = await prisma.whatsAppMessage.create({
      data: {
        workspaceId,
        leadId: leadId || null,
        recipientPhone: cleanPhone,
        direction: "OUTBOUND",
        messageType: templateName ? "TEMPLATE" : "TEXT",
        content,
        templateName: templateName || null,
        templateVariables: templateVariables || null,
        status,
        ...(submitForApproval ? {} : {}),
      },
    });

    res.json({ success: true, message: msg });
  } catch (err: any) {
    console.error("Failed to create WhatsApp message:", err);
    res.status(500).json({ error: "Failed to create message" });
  }
});

// 5. POST /api/whatsapp/messages/:id/approve — Approve & Transmit via WhatsApp Provider
router.post("/messages/:id/approve", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.userId;
    const { id } = req.params;

    const msg = await prisma.whatsAppMessage.findFirst({
      where: { id, workspaceId },
    });

    if (!msg) {
      res.status(404).json({ error: "WhatsApp message not found" });
      return;
    }

    const conn = await prisma.whatsAppConnection.findFirst({
      where: { workspaceId },
    });

    // Transmit via Provider Abstraction
    const sendRes = await metaWhatsAppCloudProvider.sendMessage(
      { to: msg.recipientPhone, text: msg.content },
      { phoneNumberId: conn?.phoneNumberId, accessToken: conn?.encryptedToken },
    );

    const updated = await prisma.whatsAppMessage.update({
      where: { id },
      data: {
        status: sendRes.success ? "SENT" : "FAILED",
        providerMessageId: sendRes.providerMessageId || null,
        approvedByUserId: userId,
        approvedAt: new Date(),
        sentAt: sendRes.success ? new Date() : null,
        errorCode: sendRes.error || null,
      },
    });

    // Update Deal or Opportunity Activity
    if (msg.leadId && sendRes.success) {
      await prisma.dealActivity.create({
        data: {
          workspaceId,
          leadId: msg.leadId,
          title: "WhatsApp Message Transmitted",
          type: "OUTREACH_SENT",
          details: {
            channel: "WHATSAPP",
            providerMessageId: sendRes.providerMessageId,
          },
        },
      });
    }

    res.json({ success: true, message: updated, sendResponse: sendRes });
  } catch (err: any) {
    console.error("Failed to approve & send WhatsApp message:", err);
    res.status(500).json({ error: "Failed to transmit message" });
  }
});

// 6. GET /api/whatsapp/messages — List Messages
router.get("/messages", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { leadId } = req.query;

    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        workspaceId,
        ...(leadId ? { leadId: String(leadId) } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(messages);
  } catch (err: any) {
    console.error("Failed to list WhatsApp messages:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// 7. GET /api/whatsapp/analytics — Metrics & Conversion Stats
router.get("/analytics", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;

    const total = await prisma.whatsAppMessage.count({
      where: { workspaceId },
    });
    const pendingApproval = await prisma.whatsAppMessage.count({
      where: { workspaceId, status: "PENDING_APPROVAL" },
    });
    const sent = await prisma.whatsAppMessage.count({
      where: { workspaceId, status: "SENT" },
    });
    const delivered = await prisma.whatsAppMessage.count({
      where: { workspaceId, status: "DELIVERED" },
    });
    const read = await prisma.whatsAppMessage.count({
      where: { workspaceId, status: "READ" },
    });
    const inboundReplies = await prisma.whatsAppMessage.count({
      where: { workspaceId, direction: "INBOUND" },
    });
    const optOuts = await prisma.whatsAppOptOut.count({
      where: { workspaceId },
    });

    res.json({
      total,
      pendingApproval,
      sent,
      delivered,
      read,
      inboundReplies,
      optOuts,
      deliveryRate:
        sent > 0 ? Math.round(((delivered + read) / sent) * 100) : 100,
      replyRate: sent > 0 ? Math.round((inboundReplies / sent) * 100) : 0,
    });
  } catch (err: any) {
    console.error("Failed to fetch WhatsApp analytics:", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
