import { prisma } from "../db";
import { getAIProvider } from "../providers/ai/index";
import { z } from "zod";

// 1. Create or Upsert Linked Deal for Opportunity
export async function createLinkedDealForOpportunity(
  opportunity: any,
  workspaceId: string,
) {
  try {
    const existingDeal = await prisma.deal.findFirst({
      where: {
        workspaceId,
        opportunityId: opportunity.id,
      },
    });

    if (existingDeal) return existingDeal;

    const dealStage =
      opportunity.verificationStatus === "VERIFIED"
        ? "QUALIFIED"
        : "RESEARCHING";
    const estVal = opportunity.opportunityScore
      ? opportunity.opportunityScore * 150
      : 12000;

    const deal = await prisma.deal.create({
      data: {
        workspaceId,
        opportunityId: opportunity.id,
        title: `Deal - ${opportunity.companyName || opportunity.title}`,
        companyName:
          opportunity.companyName || opportunity.title || "Qualified Buyer",
        stage: dealStage,
        productName: opportunity.productName || "B2B Goods",
        matchScore: opportunity.opportunityScore || 85,
        estimatedQuantity: 100,
        estimatedValue: estVal,
        recommendedNextAction:
          opportunity.recommendedNextAction || "Prepare sales outreach",
      },
    });

    return deal;
  } catch (err) {
    console.error("Failed to create linked Deal:", err);
    return null;
  }
}

// 2. Sync Outreach to Linked Deal and Conversation
export async function syncOutreachToConversationAndDeal(
  outreachId: string,
  workspaceId: string,
) {
  try {
    const outreach = await prisma.outreachMessage.findFirst({
      where: { id: outreachId, workspaceId },
      include: { lead: true, opportunity: true },
    });

    if (!outreach) return null;

    const companyName =
      outreach.opportunity?.companyName || outreach.lead?.name || "B2B Lead";

    // 1. Find or create Deal
    let deal = await prisma.deal.findFirst({
      where: {
        workspaceId,
        OR: [
          ...(outreach.dealId ? [{ id: outreach.dealId }] : []),
          ...(outreach.opportunityId
            ? [{ opportunityId: outreach.opportunityId }]
            : []),
          ...(outreach.leadId ? [{ leadId: outreach.leadId }] : []),
          { companyName: companyName },
        ],
      },
    });

    if (!deal) {
      deal = await prisma.deal.create({
        data: {
          workspaceId,
          opportunityId: outreach.opportunityId || null,
          leadId: outreach.leadId || null,
          title: `Deal - ${companyName}`,
          companyName,
          stage: "QUOTE_SENT",
          productName: outreach.opportunity?.productName || "B2B Goods",
          matchScore: outreach.opportunity?.opportunityScore || 85,
          estimatedQuantity: 100,
          estimatedValue: 12000,
          recommendedNextAction: "Awaiting buyer reply",
        },
      });
    } else {
      deal = await prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: "QUOTE_SENT",
          lastActivityAt: new Date(),
          recommendedNextAction: "Awaiting buyer reply",
        },
      });
    }

    // 2. Find or create Conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        workspaceId,
        OR: [
          ...(outreach.conversationId ? [{ id: outreach.conversationId }] : []),
          { dealId: deal.id },
          ...(outreach.opportunityId
            ? [{ opportunityId: outreach.opportunityId }]
            : []),
          { title: companyName },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          workspaceId,
          opportunityId: outreach.opportunityId || null,
          dealId: deal.id,
          title: companyName,
          status: "AWAITING_REPLY",
          lastMessagePreview: `Subject: ${outreach.subject}`,
          lastActivityAt: new Date(),
        },
      });
    } else {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          dealId: deal.id,
          opportunityId: outreach.opportunityId || conversation.opportunityId,
          status: "AWAITING_REPLY",
          lastMessagePreview: `Subject: ${outreach.subject}`,
          lastActivityAt: new Date(),
        },
      });
    }

    // 3. Create ConversationMessage for outbound email
    const existingMsg = await prisma.conversationMessage.findFirst({
      where: {
        conversationId: conversation.id,
        content: { contains: outreach.subject },
      },
    });

    if (!existingMsg) {
      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          direction: "OUTBOUND",
          content: `Subject: ${outreach.subject}\n\n${outreach.body}`,
          metadata: {
            outreachId: outreach.id,
            status: outreach.status,
            subject: outreach.subject,
          },
        },
      });
    }

    // 4. Update Outreach record links
    await prisma.outreachMessage.update({
      where: { id: outreach.id },
      data: {
        conversationId: conversation.id,
        dealId: deal.id,
      },
    });

    return { deal, conversation };
  } catch (err) {
    console.error("Failed to sync outreach to conversation & deal:", err);
    return null;
  }
}

// 3. Process Inbound / Simulated Buyer Reply with AI Commercial Analysis
export async function processBuyerReplyAndNegotiation(
  conversationId: string,
  messageText: string,
  workspaceId: string,
  isSimulated: boolean = false,
) {
  const conv = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    include: { opportunity: true, deal: true },
  });

  if (!conv) throw new Error("Conversation thread not found");

  // 1. Save Inbound Buyer Message
  const inboundMsg = await prisma.conversationMessage.create({
    data: {
      conversationId: conv.id,
      role: "user",
      direction: "INBOUND",
      isSimulated,
      content: messageText,
      metadata: {
        simulated: isSimulated,
        receivedAt: new Date().toISOString(),
      },
    },
  });

  // 2. AI Commercial Negotiation Analysis using NVIDIA NIM / Gemini
  const ai = getAIProvider();
  const analysisSchema = z.object({
    buyerIntent: z.string(),
    interestedProduct: z.string().optional(),
    quantity: z.number().optional(),
    proposedPrice: z.number().optional(),
    objection: z.string().optional(),
    urgency: z.enum(["HIGH", "MEDIUM", "LOW"]),
    recommendedStrategy: z.string(),
    draftResponse: z.string(),
  });

  let analysis: z.infer<typeof analysisSchema>;
  try {
    analysis = await ai.structured(
      [
        {
          role: "system",
          content: `You are NOVA, an expert B2B sales negotiation agent. 
Analyze the buyer's inbound reply. Extract buyer intent, product requested, quantity, proposed unit price, discount requests or objections. 
Formulate a strategic counteroffer recommendation and draft a polite, professional sales response.
IMPORTANT: You recommend a counteroffer for human review; you do NOT auto-send it.`,
        },
        {
          role: "user",
          content: `Company: ${conv.title || conv.opportunity?.companyName || "Buyer"}
Matched Product: ${conv.deal?.productName || conv.opportunity?.productName || "B2B Supply"}
Inbound Buyer Reply: "${messageText}"`,
        },
      ],
      analysisSchema,
    );
  } catch (aiErr: any) {
    console.warn("AI Negotiation Analysis fallback triggered:", aiErr.message);
    analysis = {
      buyerIntent: "COMMERCIAL_NEGOTIATION",
      interestedProduct: conv.deal?.productName || "B2B Goods",
      quantity: 100,
      proposedPrice: 11000,
      objection: "Requested bulk discount / counteroffer",
      urgency: "HIGH",
      recommendedStrategy:
        "Offer a 5% volume discount for orders over 100 units with standard delivery terms.",
      draftResponse: `Thank you for your response! We can accommodate your volume order of 100 units. While our list price is slightly higher, we can offer a special partner rate of ₹11,200 per unit for immediate commitment.`,
    };
  }

  // 3. Automatically update linked Deal stage to NEGOTIATING
  if (conv.dealId) {
    await prisma.deal.update({
      where: { id: conv.dealId },
      data: {
        stage: "NEGOTIATING",
        proposedPrice: analysis.proposedPrice || undefined,
        estimatedQuantity: analysis.quantity || undefined,
        buyerIntent: analysis.buyerIntent,
        recommendedNextAction: `Review NOVA Counteroffer: ${analysis.recommendedStrategy}`,
        lastActivityAt: new Date(),
      },
    });
  }

  // 4. Update Conversation record to ACTIVE & store last message preview
  const updatedConv = await prisma.conversation.update({
    where: { id: conv.id },
    data: {
      status: "ACTIVE",
      currentStage: "NEGOTIATION",
      lastMessagePreview: `[INBOUND] ${messageText.slice(0, 80)}...`,
      lastActivityAt: new Date(),
    },
  });

  // 5. Save AI Negotiation Analysis & Recommendation as Assistant Message
  const assistantMsg = await prisma.conversationMessage.create({
    data: {
      conversationId: conv.id,
      role: "assistant",
      direction: "OUTBOUND",
      content: `**Buyer Reply Analysis (${analysis.urgency} Urgency)**:
• **Intent**: ${analysis.buyerIntent}
${analysis.quantity ? `• **Quantity Requested**: ${analysis.quantity} units\n` : ""}${analysis.proposedPrice ? `• **Proposed Price**: ₹${analysis.proposedPrice.toLocaleString()}\n` : ""}• **Objection / Request**: ${analysis.objection || "Bulk price negotiation"}

**NOVA Strategic Recommendation**:
${analysis.recommendedStrategy}

**Proposed Counteroffer Draft (Requires User Approval)**:
${analysis.draftResponse}`,
      metadata: {
        negotiationAnalysis: analysis,
        recommendedActions: [
          {
            action: "send_counteroffer",
            label: "Approve & Send Counteroffer",
            payload: { responseText: analysis.draftResponse },
          },
          { action: "edit_counteroffer", label: "Edit Response" },
        ],
      },
    },
  });

  return {
    inboundMessage: inboundMsg,
    aiAnalysis: assistantMsg,
    conversation: updatedConv,
  };
}
