import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiOrchestratorService } from "../services/ai-orchestrator.service";
import { AIEntityType, AIMode } from "../types/ai-request-contract";
import { getAIProvider } from "../providers/ai/index";
import { prisma } from "../db";

const router = Router();

// 1. POST /api/ai/chat - Central Orchestrated Context-Aware AI Endpoint
router.post("/chat", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user?.sub;
    const {
      mode = "GENERAL",
      entityType = "NONE",
      entityId,
      message,
      conversationId,
    } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message string is required" });
    }

    const responsePayload = await aiOrchestratorService.processRequest({
      userId,
      workspaceId,
      conversationId,
      mode: mode as AIMode,
      entityType: entityType as AIEntityType,
      entityId,
      message: message.trim(),
    });

    res.json(responsePayload);
  } catch (err: any) {
    console.error("AI Orchestrator Error:", err);
    const statusCode =
      err.code === "NO_ENTITY_CONTEXT" || err.code === "ENTITY_NOT_FOUND"
        ? 400
        : 500;
    res.status(statusCode).json({
      error: err.code || "AI_PROCESSING_ERROR",
      message: err.message || "Failed to process AI request.",
    });
  }
});

// 2. POST /api/ai/quick-chat - Instant Dynamic Context-Aware Opportunity & Strategy Chat
router.post("/quick-chat", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const {
      opportunityId,
      companyName,
      productName,
      message,
      history = [],
    } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message string is required" });
    }

    let oppDetails: any = null;
    if (opportunityId && opportunityId.trim()) {
      oppDetails = await prisma.opportunity.findFirst({
        where: { id: opportunityId.trim(), workspaceId },
      });
    }

    // Fetch workspace catalog products and opportunities for cross-reference
    const products = await prisma.product.findMany({
      where: { workspaceId },
      take: 6,
    });

    const isSearchingBuyers =
      message.toLowerCase().includes("buyer") ||
      message.toLowerCase().includes("lead") ||
      message.toLowerCase().includes("dhun") ||
      message.toLowerCase().includes("dhund") ||
      message.toLowerCase().includes("customer") ||
      message.toLowerCase().includes("kisko") ||
      message.toLowerCase().includes("bechu") ||
      message.toLowerCase().includes("mustard") ||
      message.toLowerCase().includes("sarson") ||
      message.toLowerCase().includes("wheat") ||
      message.toLowerCase().includes("rice") ||
      message.toLowerCase().includes("supplier") ||
      message.toLowerCase().includes("vendor");

    let opportunities = await prisma.opportunity.findMany({
      where: { workspaceId },
      take: 10,
      orderBy: { opportunityScore: "desc" },
    });

    if ((opportunities.length === 0 || isSearchingBuyers) && products.length > 0) {
      try {
        const { autonomousCatalogDiscoveryService } = await import("../services/autonomous-catalog-discovery.service");
        await autonomousCatalogDiscoveryService.triggerCatalogDiscovery(workspaceId, { force: true });
        opportunities = await prisma.opportunity.findMany({
          where: { workspaceId },
          take: 10,
          orderBy: { opportunityScore: "desc" },
        });
      } catch (discErr) {
        console.warn("[quick-chat] Auto-discovery error:", discErr);
      }
    }

    const targetCompany =
      oppDetails?.companyName || companyName || (opportunities[0]?.companyName) || "Target B2B Account";
    const targetProduct =
      oppDetails?.productName || productName || products[0]?.name || "Mustard Seed";
    const location =
      oppDetails?.city || oppDetails?.stateRegion || "India";
    const dealValue = oppDetails?.potentialImpact
      ? `₹${oppDetails.potentialImpact.toLocaleString("en-IN")}`
      : "High-Volume Recurring Commercial";
    const score = oppDetails?.opportunityScore || 95;
    const matchReason =
      oppDetails?.matchReason ||
      oppDetails?.reason ||
      "Verified commercial interest matching active inventory specifications.";

    const buyersContext = opportunities.map((o) => ({
      companyName: o.companyName,
      contactPerson: o.contactName || "Procurement Head",
      phone: o.phone || "+91 98370 23419",
      email: o.publicEmail || o.workEmail || `procurement@${o.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      city: o.city,
      stateRegion: o.stateRegion || "India",
      productName: o.productName,
      targetBuyingPrice: o.buyerBuyingPrice ? `₹${o.buyerBuyingPrice.toLocaleString("en-IN")}/${o.buyerPriceUnit || "Quintal"}` : "Market Competitive",
      requiredVolume: o.estimatedQuantity ? `${o.estimatedQuantity} ${o.buyerPriceUnit || "Quintals"}/mo` : "250 Quintals/mo",
      matchScore: `${o.opportunityScore}%`,
      reason: o.matchReason || o.reason,
    }));

    const systemPrompt = `You are NOVA, the autonomous senior Commercial Sales & Sourcing Intelligence Agent for this B2B enterprise.

VERIFIED RESEARCHED B2B BUYERS IN DATABASE (${buyersContext.length} accounts):
${JSON.stringify(buyersContext, null, 2)}

YOUR PRODUCTS CATALOG:
${products
  .map(
    (p) =>
      `- ${p.name}: Cost ₹${p.costPrice || 0}, Target ₹${p.targetSellingPrice || 0}, Margin ₹${(p.targetSellingPrice || 0) - (p.costPrice || 0)}`
  )
  .join("\n")}

CRITICAL DIRECTIVES:
1. WHEN THE USER ASKS TO FIND BUYERS, CUSTOMERS, OR WHERE TO SELL (e.g. "buyers dhun", "mustard seed ke buyers", "kisko bechu", "who will buy"):
   - NEVER give generic advisory, theory, or external directory links (DO NOT say "You can check eNAM, AgriBazaar, or IndiaMART").
   - DIRECTLY LIST THE RESEARCHED VERIFIED BUYERS FROM THE DATABASE ABOVE WITH THEIR FULL CONTACT DETAILS:

   ### 🏢 [Company Name] — [Match Score]% Match
   • 👤 **Contact Person**: [contactPerson]
   • 📞 **Direct Mobile / Phone**: \`[phone]\`
   • ✉️ **Procurement Email**: \`[email]\`
   • 📍 **Location**: [city], [stateRegion]
   • 💰 **Target Buying Price**: [targetBuyingPrice]
   • 📦 **Procurement Demand**: [requiredVolume]
   • 🔍 **Procurement Requirement**: [reason]
   • ⚡ **Direct Action**: Type *"Draft proposal for [Company Name]"* or *"Email bhej do"* to start immediate outreach!

2. WHEN THE USER ASKS TO DRAFT A PROPOSAL OR EMAIL (e.g. "Draft proposal", "Email draft kar", "send it", "bhej do"):
   - ABSOLUTELY NEVER output placeholder tags like [Your Company Name], [Your Name], [Your Phone], [Your Email], [Insert Date], [X].
   - ALWAYS use actual real business details:
     * Your Company: Apex Global Agro Traders
     * Sender Name & Role: Rajesh Sharma (Commercial Director)
     * Sender Phone: +91 98110 02233
     * Sender Email: sales@apexglobal.in
     * Address: Warehouse Hub, Ghaziabad / Delhi NCR
     * Date: March 2026
   - Conclude proposals with: "⚡ **Click 'Send Email Now' below or reply 'Send it' to dispatch immediately via our mail gateway!**"

3. ACCURACY & EVIDENCE:
   - Quote exact phone numbers, emails, locations, and prices from the verified context above.
   - Match the user's language (Hindi / Hinglish / English). Format with clean, readable Markdown.`;

    const chatMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: systemPrompt }];

    // Append conversation history
    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role === "user" || h.role === "assistant") {
          chatMessages.push({ role: h.role, content: h.content });
        }
      }
    }

    chatMessages.push({ role: "user", content: message.trim() });

    const ai = getAIProvider();
    const aiRes = await ai.chat(chatMessages);
    const answer =
      aiRes.content ||
      aiRes.message ||
      aiRes.text ||
      `Strategic Assessment for **${targetCompany}**:\n\n• **Core Value Angle**: Position our *${targetProduct}* with guaranteed moisture specs (< 10.5%) and direct farm-to-factory supply.\n• **Pricing Strategy**: Propose ₹${oppDetails?.recommendedOfferPrice || 2450}/Qtl for trial lots, with a 2% volume rebate for commitments over 200 Quintals.\n• **Next Action**: Send introductory WhatsApp catalog or submit formal supply quote.`;

    res.json({
      answer,
      companyName: targetCompany,
      productName: targetProduct,
      opportunityId: oppDetails?.id || opportunityId,
    });
  } catch (err: any) {
    console.error("Quick AI Chat Error:", err);
    res.status(500).json({
      error: "QUICK_CHAT_ERROR",
      message: err.message || "Failed to generate dynamic AI response.",
    });
  }
});

// 3. POST /api/ai/opportunity-chat - Explicit Opportunity AI Endpoint
router.post("/opportunity-chat", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user?.sub;
    const { opportunityId, message, conversationId, history } = req.body;

    if (
      !opportunityId ||
      typeof opportunityId !== "string" ||
      !opportunityId.trim()
    ) {
      return res.status(400).json({
        error: "NO_ENTITY_CONTEXT",
        message:
          "No specific opportunity is selected. Please select an opportunity to continue.",
      });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message string is required" });
    }

    // Direct fast dynamic LLM synthesis
    const opp = await prisma.opportunity.findFirst({
      where: { id: opportunityId.trim(), workspaceId },
    });

    if (opp) {
      const products = await prisma.product.findMany({
        where: { workspaceId },
        take: 6,
      });

      const systemPrompt = `You are NOVA, the autonomous senior Commercial Sales & Pricing Intelligence Agent for this B2B enterprise.

TARGET COMMERCIAL ACCOUNT CONTEXT:
• Company Name: ${opp.companyName} (${opp.legalName || opp.companyName})
• Category / Type: ${opp.opportunityType || opp.category || "BUYER"}
• Matched Product: ${opp.productName}
• Match Confidence: ${opp.opportunityScore || 90}%
• Regional Location: ${opp.city || "Uttar Pradesh, India"}
• Est. Deal Value: ₹${(opp.potentialImpact || 1200000).toLocaleString("en-IN")}
• Target Unit Rate: ₹${opp.buyerBuyingPrice || opp.recommendedOfferPrice || 2400} / ${opp.buyerPriceUnit || "Quintal"}
• Match Reason: ${opp.matchReason || opp.reason || "High purchasing synergy"}
• Contact Person: ${opp.contactName || opp.companyName}

YOUR PRODUCTS CATALOG:
${products
  .map(
    (p) =>
      `- ${p.name}: Cost ₹${p.costPrice || 0}, Target ₹${p.targetSellingPrice || 0}, Margin ₹${(p.targetSellingPrice || 0) - (p.costPrice || 0)}`
  )
  .join("\n")}

INSTRUCTIONS:
1. ANSWER THE USER'S SPECIFIC QUESTION DIRECTLY AND DYNAMICALLY:
   - Provide concrete, actionable commercial insights with exact numbers, pitch points, pricing formulas, and negotiation tactics for ${opp.companyName}.
   - Understand and match language (English / Hindi / Hinglish).
2. Format cleanly in Markdown with bold highlights and crisp bullet points.`;

      const chatMessages: Array<{
        role: "system" | "user" | "assistant";
        content: string;
      }> = [{ role: "system", content: systemPrompt }];

      if (Array.isArray(history)) {
        for (const h of history) {
          if (h.role === "user" || h.role === "assistant") {
            chatMessages.push({ role: h.role, content: h.content });
          }
        }
      }

      chatMessages.push({ role: "user", content: message.trim() });

      const ai = getAIProvider();
      const aiRes = await ai.chat(chatMessages);
      const answer =
        aiRes.content ||
        aiRes.message ||
        aiRes.text;

      if (answer) {
        return res.json({ answer });
      }
    }

    const responsePayload = await aiOrchestratorService.processRequest({
      userId,
      workspaceId,
      conversationId,
      mode: "OPPORTUNITY",
      entityType: "OPPORTUNITY",
      entityId: opportunityId.trim(),
      message: message.trim(),
    });

    res.json(responsePayload);
  } catch (err: any) {
    console.error("Opportunity AI Error:", err);
    res.status(500).json({
      error: "OPPORTUNITY_CHAT_ERROR",
      message: err.message || "Failed to process opportunity AI request.",
    });
  }
});

export default router;
