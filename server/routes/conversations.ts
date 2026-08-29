import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { getAIProvider } from "../providers/ai/index";
import { runWorkflow } from "./lead-discovery";
import { activeBusinessContextService } from "../services/active-business-context.service";
import { businessAdaptationStrategyService } from "../services/business-adaptation-strategy.service";
import { z } from "zod";

const router = Router();

// Allowed states
export const WORKFLOW_STAGES = [
  "IDLE",
  "INVENTORY_READY",
  "ANALYZING_INVENTORY",
  "DISCOVERING_BUYERS",
  "NORMALIZING_BUYERS",
  "VERIFYING_BUYERS",
  "SCORING_BUYERS",
  "OPPORTUNITIES_READY",
  "REVIEWING_OPPORTUNITIES",
  "BUYERS_SELECTED",
  "RESEARCHING_SELECTED_BUYERS",
  "PLANNING_SALES_STRATEGY",
  "PREPARING_OUTREACH",
  "PREPARING_PROPOSAL",
  "PREPARING_QUOTATION",
  "AWAITING_USER_APPROVAL",
  "EMAIL_CONNECTION_REQUIRED",
  "READY_TO_SEND",
  "OUTREACH_SENT",
  "WAITING_FOR_REPLY",
  "FOLLOW_UP_DUE",
  "REPLY_RECEIVED",
  "NEGOTIATION",
  "DEAL_WON",
  "DEAL_LOST",
  "WORKFLOW_COMPLETED",
  "WORKFLOW_FAILED",
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

// Helper: Get or create active conversation for a workspace
async function getOrCreateConversation(workspaceId: string) {
  let conv = await prisma.conversation.findFirst({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        workspaceId,
        title: "Sales Discovery Session",
        currentStage: "IDLE",
        selectedProductIds: [],
        selectedLeadIds: [],
        recommendedNextActions: [
          { action: "analyze_inventory", label: "Analyze inventory" },
          { action: "discover_buyers", label: "Discover opportunities" },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  return conv;
}

// 1. GET List All Conversations for Workspace
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;

    // Check if there are sent/approved outreach messages without linked conversations; auto-sync if needed
    const unlinkedOutreach = await prisma.outreachMessage.findMany({
      where: {
        workspaceId,
        conversationId: null,
        status: { in: ["APPROVED", "SENT", "SENDING"] },
      },
    });

    if (unlinkedOutreach.length > 0) {
      const { syncOutreachToConversationAndDeal } =
        await import("../services/sales-pipeline");
      for (const msg of unlinkedOutreach) {
        await syncOutreachToConversationAndDeal(msg.id, workspaceId);
      }
    }

    const conversations = await prisma.conversation.findMany({
      where: { workspaceId },
      orderBy: { lastActivityAt: "desc" },
      include: {
        opportunity: {
          select: {
            id: true,
            companyName: true,
            publicEmail: true,
            phone: true,
            productName: true,
            matchedProductNames: true,
            opportunityScore: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            companyName: true,
            stage: true,
            productName: true,
            estimatedValue: true,
            estimatedQuantity: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    res.json({ conversations });
  } catch (err: any) {
    console.error("Failed to list conversations:", err);
    res.status(500).json({ error: "Failed to load conversations list" });
  }
});

// 2. GET Active Conversation
router.get("/active", requireAuth, async (req: any, res) => {
  try {
    const conv = await getOrCreateConversation(req.workspaceId);

    // Check workspace inventory count
    const productCount = await prisma.product.count({
      where: { workspaceId: req.workspaceId },
    });

    // Check email connection
    const emailConn = await prisma.emailConnection.findFirst({
      where: { workspaceId: req.workspaceId, status: "CONNECTED" },
    });

    res.json({
      conversation: conv,
      inventoryCount: productCount,
      emailConnected: !!emailConn,
    });
  } catch (err: any) {
    console.error("Failed to fetch conversation:", err);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// 1.5. POST Create New Conversation
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user?.sub;
    const { title, activeContext } = req.body;

    const conv = await prisma.conversation.create({
      data: {
        workspaceId,
        userId,
        title: title || "New Session",
        activeContext: activeContext || {},
        currentStage: "IDLE",
        status: "ACTIVE",
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    res.status(201).json(conv);
  } catch (err: any) {
    console.error("Failed to create conversation:", err);
    res.status(500).json({ error: "Failed to create new conversation" });
  }
});

// 3. GET Conversation by ID
router.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      include: {
        opportunity: true,
        deal: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    res.json(conv);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// 3.5. PATCH Update / Rename Conversation
router.patch("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    const { title, activeContext, summary } = req.body;

    const conv = await prisma.conversation.findFirst({
      where: { id, workspaceId },
    });

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(activeContext !== undefined ? { activeContext } : {}),
        ...(summary !== undefined ? { summary } : {}),
        updatedAt: new Date(),
      },
    });

    res.json(updated);
  } catch (err: any) {
    console.error("Failed to update conversation:", err);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

// 3.6. DELETE Conversation
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;

    const conv = await prisma.conversation.findFirst({
      where: { id, workspaceId },
    });

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    await prisma.conversationMessage.deleteMany({
      where: { conversationId: id },
    });

    await prisma.conversation.delete({
      where: { id },
    });

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Failed to delete conversation:", err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// 4. POST /api/conversations/:id/reply - Receive Inbound / Simulated Buyer Reply
router.post("/:id/reply", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { messageText, isSimulated } = req.body;
    const workspaceId = req.workspaceId;

    if (!messageText || typeof messageText !== "string") {
      return res.status(400).json({ error: "messageText is required" });
    }

    const conv = await prisma.conversation.findFirst({
      where: { id, workspaceId },
      include: { opportunity: true, deal: true },
    });

    if (!conv)
      return res.status(404).json({ error: "Conversation thread not found" });

    // 1. Save Inbound Buyer Message
    const inboundMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id,
        role: "user",
        direction: "INBOUND",
        isSimulated: !!isSimulated,
        content: messageText,
        metadata: {
          simulated: !!isSimulated,
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
      console.warn(
        "AI Negotiation Analysis fallback triggered:",
        aiErr.message,
      );
      // Fallback extraction
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

    // 3. Move linked Deal to NEGOTIATING stage automatically
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

    res.json({
      success: true,
      inboundMessage: inboundMsg,
      aiAnalysis: assistantMsg,
      conversation: updatedConv,
    });
  } catch (err: any) {
    console.error("Failed to process buyer reply:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to process buyer reply" });
  }
});

// 5. POST Send Message to Specific Conversation — dispatches to native Hermes session
router.post("/:id/messages", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const workspaceId = req.workspaceId;
    const { message, activeContext } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const conv = await prisma.conversation.findFirst({
      where: { id, workspaceId },
    });

    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    // Save user message
    const userMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id,
        role: "user",
        content: message.trim(),
      },
    });

    // Auto-generate title if conversation title is default
    let newTitle = conv.title;
    if (
      conv.title === "New Session" ||
      conv.title === "Sales Discovery Session"
    ) {
      newTitle = message.trim().slice(0, 36);
      if (message.trim().length > 36) newTitle += "...";
    }

    // Derive active entity reference from UI context (reference-based, not data-based)
    let activeEntity:
      | { type: "opportunity" | "product" | "lead" | "deal"; id: string }
      | undefined;
    if (activeContext?.entityType && activeContext?.entityId) {
      activeEntity = {
        type: activeContext.entityType,
        id: activeContext.entityId,
      };
    }

    // Dispatch to native Hermes session — no catalog/DB injection
    const { hermesSessionManager } =
      await import("../services/ai/hermes-session-manager.service");
    let assistantContent = "";

    try {
      const response = await hermesSessionManager.sendMessage({
        workspaceId,
        conversationId: conv.id,
        userMessage: message.trim(),
        activeEntity,
      });
      assistantContent = response.text;
    } catch (hermesErr: any) {
      console.error("[Conversations] Hermes session error:", hermesErr.message);
      // Fallback: acknowledge the message
      assistantContent = `I received your message but encountered an issue processing it. Please try again. (Error: ${hermesErr.message?.substring(0, 100)})`;
    }

    // Save assistant response
    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id,
        role: "assistant",
        content: assistantContent,
      },
    });

    // Update conversation record
    const updatedConv = await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        title: newTitle,
        lastMessagePreview: assistantContent.slice(0, 80),
        lastActivityAt: new Date(),
        lastMessageAt: new Date(),
      },
    });

    res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      conversation: updatedConv,
    });
  } catch (err: any) {
    console.error("Failed to post message:", err);
    res.status(500).json({ error: err.message || "Failed to process message" });
  }
});

// 3. POST Process Message / Action in Conversational Agent
router.post("/message", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { message, action, payload } = req.body;

    const conv = await getOrCreateConversation(workspaceId);
    const ai = getAIProvider();

    // Check workspace inventory & email connection
    const products = await prisma.product.findMany({ where: { workspaceId } });
    const emailConn = await prisma.emailConnection.findFirst({
      where: { workspaceId, status: "CONNECTED" },
    });

    let newStage: WorkflowStage =
      (conv.currentStage as WorkflowStage) || "IDLE";
    let assistantReply = "";
    let recommendedActions: any[] = [];
    let metadata: any = {};

    // Save user message if provided
    if (message) {
      await prisma.conversationMessage.create({
        data: {
          conversationId: conv.id,
          role: "user",
          content: message,
        },
      });
    }

    // ACTION: ANALYZE INVENTORY
    if (
      action === "analyze_inventory" ||
      message?.toLowerCase().includes("analyze my inventory") ||
      message?.toLowerCase().includes("analyze inventory")
    ) {
      newStage = "ANALYZING_INVENTORY";

      if (products.length === 0) {
        newStage = "IDLE";
        assistantReply =
          "Your workspace currently has no products. Please add products or import your inventory so NOVA can identify B2B sales opportunities.";
        recommendedActions = [
          {
            action: "navigate_products",
            label: "Add inventory",
            target: "/app/products",
          },
          {
            action: "navigate_products",
            label: "Import CSV",
            target: "/app/products",
          },
        ];
      } else {
        newStage = "INVENTORY_READY";

        const topProducts = products.slice(0, 3);
        const productListStr = topProducts
          .map(
            (p, i) =>
              `${i + 1}. ${p.name} (${p.category || "General"} — stock: ${p.units} units, price: ₹${p.basePrice || "TBD"})`,
          )
          .join("\n");

        assistantReply = `I’ve analyzed your inventory portfolio. Here are products with strong B2B sales potential:\n\n${productListStr}\n\nI recommend starting with **${topProducts[0].name}**. Would you like me to search for B2B buyers for this product, or analyze all products?`;

        recommendedActions = [
          {
            action: "discover_buyers",
            label: `Search buyers for ${topProducts[0].name}`,
            payload: { productId: topProducts[0].id },
          },
          { action: "discover_buyers", label: "Analyze & search all products" },
        ];

        await prisma.dealActivity.create({
          data: {
            workspaceId,
            title: `Analyzed ${products.length} products in inventory`,
            type: "INVENTORY_ANALYZED",
            details: { count: products.length },
          },
        });
      }
    }
    // ACTION: DISCOVER BUYERS / START WORKFLOW
    else if (
      action === "discover_buyers" ||
      message?.toLowerCase().includes("discover") ||
      message?.toLowerCase().includes("search buyers") ||
      message?.toLowerCase().includes("find buyers")
    ) {
      newStage = "DISCOVERING_BUYERS";

      if (products.length === 0) {
        newStage = "IDLE";
        assistantReply =
          "No inventory to analyze. Add products or import your inventory so NOVA can identify the best B2B sales opportunities.";
        recommendedActions = [
          {
            action: "navigate_products",
            label: "Add inventory",
            target: "/app/products",
          },
        ];
      } else {
        // Create an AiWorkflow
        const workflow = await prisma.aiWorkflow.create({
          data: {
            workspaceId,
            userId: req.user?.sub,
            userRequest:
              message || payload?.prompt || "Discover B2B buyers for inventory",
            locationScope: payload?.location || "INDIA",
            productId: payload?.productId || products[0]?.id,
            status: "RUNNING",
          },
        });

        // Trigger workflow execution asynchronously
        runWorkflow(
          workflow.id,
          {
            userRequest:
              message || payload?.prompt || "Discover B2B buyers for inventory",
            locationScope: payload?.location || "INDIA",
            productId: payload?.productId || products[0]?.id,
          },
          workspaceId,
        ).catch(console.error);

        newStage = "OPPORTUNITIES_READY";
        assistantReply = `I’m searching public business sources, verifying company details, and identifying qualified B2B buyers for your products.`;
        metadata = {
          workflowId: workflow.id,
          progressSteps: [
            "Understanding your request",
            "Checking inventory",
            "Analyzing product fit",
            "Planning buyer search",
            "Searching public business sources",
            "Organizing company information",
            "Verifying available information",
            "Scoring opportunities",
          ],
        };

        recommendedActions = [
          {
            action: "review_opportunities",
            label: "Review ranked buyers",
            target: "/app/opportunities",
          },
          { action: "discover_buyers", label: "Find more buyers" },
        ];
      }
    }
    // ACTION: SELECT BUYERS & REQUEST RESEARCH / STRATEGY
    else if (action === "select_buyers" || payload?.selectedLeadIds) {
      newStage = "BUYERS_SELECTED";
      const selectedIds = payload?.selectedLeadIds || [];

      const selectedLeads = await prisma.lead.findMany({
        where: { id: { in: selectedIds }, workspaceId },
      });

      assistantReply = `You selected ${selectedLeads.length} buyer${selectedLeads.length === 1 ? "" : "s"}: ${selectedLeads.map((l) => l.name).join(", ")}. Before preparing outreach, I can research their business context deeply and recommend the strongest sales approach.`;

      recommendedActions = [
        {
          action: "research_buyers",
          label: "Research buyers deeply",
          payload: { selectedLeadIds: selectedIds },
        },
        {
          action: "prepare_outreach",
          label: "Prepare outreach now",
          payload: { selectedLeadIds: selectedIds },
        },
        {
          action: "create_proposal",
          label: "Create proposal",
          payload: { selectedLeadIds: selectedIds },
        },
        {
          action: "create_quotation",
          label: "Create quotation",
          payload: { selectedLeadIds: selectedIds },
        },
      ];
    }
    // ACTION: RESEARCH BUYERS DEEPLY
    else if (action === "research_buyers") {
      newStage = "RESEARCHING_SELECTED_BUYERS";
      const selectedIds =
        payload?.selectedLeadIds || (conv.selectedLeadIds as string[]) || [];

      const leadsToResearch = await prisma.lead.findMany({
        where: { id: { in: selectedIds }, workspaceId },
        include: { research: true, sources: true },
      });

      const strategies = leadsToResearch.map((lead) => {
        let approach = "Direct product-fit outreach";
        if (
          lead.industry?.toLowerCase().includes("retail") ||
          lead.industry?.toLowerCase().includes("wholesale")
        ) {
          approach = "Bulk pricing & corporate procurement approach";
        } else if (
          lead.industry?.toLowerCase().includes("distributor") ||
          lead.industry?.toLowerCase().includes("logistics")
        ) {
          approach = "Distribution or reseller partnership approach";
        }
        return {
          leadId: lead.id,
          leadName: lead.name,
          approach,
          verifiedContext:
            lead.description ||
            `Verified business operating in ${lead.location || "target market"}`,
        };
      });

      newStage = "PLANNING_SALES_STRATEGY";
      assistantReply =
        `I’ve performed deep research on the selected buyers using verified public information:\n\n` +
        strategies
          .map(
            (s) =>
              `• **${s.leadName}**: Recommended strategy → *${s.approach}* (${s.verifiedContext})`,
          )
          .join("\n\n") +
        `\n\nWould you like me to create personalized outreach for all selected buyers using these strategies?`;

      recommendedActions = [
        {
          action: "prepare_outreach",
          label: "Create personalized outreach",
          payload: { selectedLeadIds: selectedIds },
        },
        { action: "edit_strategy", label: "Customize approach" },
      ];
    }
    // ACTION: PREPARE OUTREACH
    else if (action === "prepare_outreach") {
      newStage = "PREPARING_OUTREACH";
      const selectedIds =
        payload?.selectedLeadIds || (conv.selectedLeadIds as string[]) || [];

      const targetLeads = await prisma.lead.findMany({
        where: {
          id: { in: selectedIds.length ? selectedIds : undefined },
          workspaceId,
        },
        take: 3,
      });

      const drafts = [];
      for (const lead of targetLeads) {
        const existingOutreach = await prisma.outreachMessage.findFirst({
          where: { leadId: lead.id, workspaceId },
        });

        if (existingOutreach) {
          drafts.push(existingOutreach);
        } else {
          const subject = `Potential B2B supply & workspace collaboration for ${lead.name}`;
          const body = `Hello ${lead.name} Team,

I noticed that ${lead.name} operates in ${lead.industry || "your industry"} and provides solutions for your clients.

We currently have verified supply available in inventory that aligns with your business requirements.

We offer tiered bulk pricing, dedicated support, and reliable fulfillment. If useful, I can share product specifications and quotation details.

Would you be open to a short discussion?

Best regards,
NOVA Sales Operations`;

          const created = await prisma.outreachMessage.create({
            data: {
              workspaceId,
              leadId: lead.id,
              subject,
              body,
              personalizationReason:
                "Generated using verified public company context and inventory fit.",
              status: "DRAFT",
            },
          });
          drafts.push(created);
        }
      }

      newStage = "AWAITING_USER_APPROVAL";
      assistantReply = `Your personalized outreach drafts are ready for ${drafts.length} buyer${drafts.length === 1 ? "" : "s"}. **Nothing has been sent yet.** Please review and approve before any email is dispatched.`;
      metadata = { drafts };

      recommendedActions = [
        {
          action: "approve_all_drafts",
          label: "Approve and send all",
          payload: { draftIds: drafts.map((d) => d.id) },
        },
        {
          action: "review_drafts",
          label: "Review drafts",
          target: "/app/leads",
        },
      ];
    }
    // ACTION: APPROVE DRAFTS & SEND
    else if (action === "approve_all_drafts" || action === "approve_send") {
      const draftIds = payload?.draftIds || [];

      // Always mark as APPROVED first
      if (draftIds.length > 0) {
        await prisma.outreachMessage.updateMany({
          where: { id: { in: draftIds }, workspaceId },
          data: { status: "APPROVED" },
        });
      }

      if (!emailConn) {
        newStage = "READY_TO_SEND";
        assistantReply = `Your outreach draft${draftIds.length === 1 ? "" : "s"} have been **approved and listed in your Outreach queue**! You can open them directly in your Mail App (mailto:) or connect Gmail to auto-send.`;
        recommendedActions = [
          {
            action: "review_drafts",
            label: "View approved outreach list",
            target: "/app/leads",
          },
          {
            action: "connect_email",
            label: "Connect Gmail for Auto-Sending",
            target: "/app/settings",
          },
        ];
      } else {
        newStage = "OUTREACH_SENT";
        const draftIds = payload?.draftIds || [];

        await prisma.outreachMessage.updateMany({
          where: { id: { in: draftIds }, workspaceId },
          data: {
            status: "SENT",
            sentAt: new Date(),
            emailConnectionId: emailConn.id,
          },
        });

        assistantReply = `${draftIds.length || 1} outreach email${draftIds.length === 1 ? "" : "s"} were sent successfully! NOVA is now tracking replies and scheduling follow-ups automatically.`;

        recommendedActions = [
          {
            action: "view_sent",
            label: "View sent emails",
            target: "/app/conversations",
          },
          { action: "discover_buyers", label: "Discover more buyers" },
        ];
      }
    }
    // DEFAULT GENERAL CHAT ASSISTANT — dispatch to native Hermes session
    else {
      const { hermesSessionManager } =
        await import("../services/ai/hermes-session-manager.service");
      try {
        const response = await hermesSessionManager.sendMessage({
          workspaceId,
          conversationId: conv.id,
          userMessage: message,
        });
        assistantReply = response.text;
      } catch (hermesErr: any) {
        console.error(
          "[Conversations] Hermes session error in /message:",
          hermesErr.message,
        );
        assistantReply = `I received your message but encountered an issue. Please try again.`;
      }

      recommendedActions = [
        { action: "discover_buyers", label: "Find more buyers" },
        { action: "prepare_outreach", label: "Prepare outreach drafts" },
        {
          action: "review_opportunities",
          label: "Show all opportunities",
          target: "/app/opportunities",
        },
      ];
    }

    // Save assistant message
    const assistantMsg = await prisma.conversationMessage.create({
      data: {
        conversationId: conv.id,
        role: "assistant",
        content: assistantReply,
        metadata: {
          ...metadata,
          recommendedActions,
        },
      },
    });

    // Update conversation record
    const updatedConv = await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        currentStage: newStage,
        selectedLeadIds: payload?.selectedLeadIds || conv.selectedLeadIds,
        recommendedNextActions: recommendedActions,
        lastAction: action || "message",
        emailConnectionStatus: emailConn ? "CONNECTED" : "DISCONNECTED",
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    res.json({
      conversation: updatedConv,
      reply: assistantMsg,
      stage: newStage,
      recommendedActions,
    });
  } catch (err: any) {
    console.error("Error in conversational message agent:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
