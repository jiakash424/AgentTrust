import { Router } from "express";
import { prisma } from "../db";
import { z } from "zod";
import { verifyToken } from "../middleware/auth";
import { getAIProvider } from "../providers/ai/index";
import { syncOutreachToConversationAndDeal } from "../services/sales-pipeline";
import { workflowEvents } from "../events/workflow-events";
import { activeBusinessContextService } from "../services/active-business-context.service";
import { businessAdaptationStrategyService } from "../services/business-adaptation-strategy.service";
import { hermesBuyerResearchAgentService } from "../services/hermes-buyer-research-agent.service";

const router = Router();

const startWorkflowHandler = async (req: any, res: any) => {
  try {
    let userId = "dev-user";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload: any = await verifyToken(token).catch(() => null);
      if (payload && payload.sub) {
        userId = payload.sub;
      }
    }

    const reqPrompt =
      req.body.userRequest ||
      req.body.prompt ||
      req.body.query ||
      "Discover B2B buyers for my products";

    const inputSchema = z.object({
      userRequest: z.string().min(1, "userRequest is required"),
      locationScope: z.string().default("INDIA"),
      customLocation: z.string().optional(),
      productId: z.string().optional(),
      inventoryId: z.string().optional(),
    });

    const input = inputSchema.parse({
      ...req.body,
      userRequest: reqPrompt,
    });
    let workspaceId = req.workspaceId;
    if (!workspaceId) {
      const ws =
        (await prisma.workspace.findFirst({
          where: { members: { some: { userId } } },
        })) || (await prisma.workspace.findFirst());
      workspaceId = ws?.id;
    }

    if (!workspaceId) {
      res
        .status(400)
        .json({
          error: "No workspace found. Please create a workspace first.",
        });
      return;
    }

    const workflow = await prisma.aiWorkflow.create({
      data: {
        workspaceId: workspaceId,
        userId: userId,
        userRequest: input.userRequest,
        locationScope: input.locationScope,
        customLocation: input.customLocation,
        productId: input.productId,
        inventoryId: input.inventoryId,
        status: "RUNNING",
      },
    });

    runWorkflow(workflow.id, input, workspaceId).catch(console.error);

    res.json({ workflowId: workflow.id, status: "RUNNING" });
  } catch (error: any) {
    console.error("[startWorkflowHandler error]", error);
    res.status(400).json({ error: error.message || "Invalid request payload" });
  }
};

router.post("/start", startWorkflowHandler);
router.post("/", startWorkflowHandler);

router.get("/:workflowId/stream", async (req, res) => {
  const { workflowId } = req.params;
  const token = req.query.token as string;

  if (token && !token.startsWith("usr_tok_") && token !== "dev_tok") {
    try {
      await verifyToken(token);
    } catch (tokenErr) {
      console.warn(
        "[lead-discovery/stream] Token verification failed, proceeding with stream fallback",
      );
    }
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Send immediate SSE comment to flush reverse-proxy buffers
  res.write(": connected\n\n");

  // Keep-alive heartbeat every 10s
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 10000);

  // Register client stream with central WorkflowEventManager
  workflowEvents.registerStream(workflowId, res);

  res.on("close", () => {
    clearInterval(heartbeatTimer);
  });

  // Instantly send current state if already completed
  try {
    const wf = await prisma.aiWorkflow.findUnique({
      where: { id: workflowId },
    });
    if (wf) {
      if (wf.status === "COMPLETED") {
        res.write(
          `data: ${JSON.stringify({ type: "workflow_completed", stage: "workflow_completed", timestamp: new Date().toISOString() })}\n\n`,
        );
      } else {
        res.write(
          `data: ${JSON.stringify({ type: "workflow_started", stage: "workflow_started", timestamp: new Date().toISOString() })}\n\n`,
        );
      }
    }
  } catch (err) {}
});

export async function runWorkflow(
  workflowId: string,
  input: any,
  workspaceId: string,
) {
  await prisma.aiWorkflow
    .upsert({
      where: { id: workflowId },
      update: {},
      create: {
        id: workflowId,
        workspaceId: workspaceId,
        userRequest: input.userRequest || "Lead Discovery",
        locationScope: input.locationScope || "India",
        productId: input.productId || null,
        status: "RUNNING",
      },
    })
    .catch(console.error);

  try {
    const rawPrompt = (input.userRequest || "").trim();
    const userPrompt = rawPrompt.toLowerCase();

    // 1. CONVERSATIONAL FILLER INTENT RECOGNITION
    const conversationalKeywords = [
      "ok",
      "ok fine",
      "okay",
      "fine",
      "thanks",
      "thank you",
      "got it",
      "cool",
      "nice",
      "sounds good",
      "understood",
      "awesome",
      "yes",
      "sure",
      "hi",
      "hello",
      "good",
      "perfect",
      "alright",
      "great",
      "thx",
    ];

    const isConversational =
      userPrompt.length <= 30 &&
      conversationalKeywords.some(
        (kw) =>
          userPrompt === kw ||
          userPrompt.startsWith(kw + " ") ||
          userPrompt.endsWith(" " + kw),
      );

    if (isConversational) {
      console.log(
        `[runWorkflow] Detected CONVERSATIONAL input: "${rawPrompt}"`,
      );

      workflowEvents.emitProgress({
        workflowId,
        stage: "workflow_started",
        stepName: "Processing conversational response...",
        completedSteps: 1,
        totalSteps: 2,
        timestamp: new Date().toISOString(),
      });

      let conversationalReply =
        "You're welcome! I'm here whenever you need to discover new B2B buyers, draft personalized outreach proposals, or negotiate deals.";

      try {
        const ai = getAIProvider();
        const aiRes = await ai.chat([
          {
            role: "system",
            content:
              "You are NOVA, a friendly and highly professional B2B AI Sales Agent. Respond warmly and concisely to the user's conversational message. Remind them you are ready for their next sales or B2B buyer discovery command.",
          },
          { role: "user", content: rawPrompt },
        ]);
        if (aiRes.content) conversationalReply = aiRes.content;
      } catch (e) {}

      await prisma.aiWorkflow.upsert({
        where: { id: workflowId },
        update: {
          status: "COMPLETED",
          discoveredCount: 0,
          qualifiedCount: 0,
          completedAt: new Date(),
        },
        create: {
          id: workflowId,
          workspaceId,
          userRequest: input.userRequest,
          locationScope: "INDIA",
          status: "COMPLETED",
          discoveredCount: 0,
          qualifiedCount: 0,
          completedAt: new Date(),
        },
      });

      workflowEvents.emitProgress({
        workflowId,
        stage: "workflow_completed",
        stepName: conversationalReply,
        completedSteps: 2,
        totalSteps: 2,
        details: { conversationalReply },
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // 2. INVENTORY & PRODUCT CATALOG ANALYSIS INTENT RECOGNITION (Fast 1-2s Response)
    const isInventoryCommand =
      userPrompt.includes("inventory") ||
      userPrompt.includes("stock") ||
      userPrompt.includes("analyze my") ||
      userPrompt.includes("what products") ||
      userPrompt.includes("my products") ||
      userPrompt.includes("check catalog") ||
      userPrompt.includes("available stock");

    if (isInventoryCommand) {
      console.log(
        `[runWorkflow] Fast INVENTORY ANALYSIS triggered: "${rawPrompt}"`,
      );

      workflowEvents.emitProgress({
        workflowId,
        stage: "inventory_loaded",
        stepName: "Inspecting product catalog & warehouse stock...",
        completedSteps: 1,
        totalSteps: 3,
        timestamp: new Date().toISOString(),
      });

      const products = await prisma.product.findMany({
        where: { workspaceId },
      });
      const inventory = await prisma.inventoryItem.findMany({
        where: { workspaceId },
        include: { product: true },
      });
      const activeCtx =
        await activeBusinessContextService.resolveContext(workspaceId);

      const buildDirectInventoryAnalysis = () => {
        const totalStock = products.reduce(
          (acc, p) => acc + (p.units || 0),
          0,
        );
        const totalValue = products.reduce(
          (acc, p) => acc + (p.units || 0) * (p.costPrice || 0),
          0,
        );

        let md = `## 🌾 Real-Time Inventory & Commercial Analysis\n\n`;
        md += `**Total Inventory:** ${totalStock.toLocaleString()} Units | **Total Valuation @ Cost:** ₹${totalValue.toLocaleString("en-IN")}\n\n`;
        md += `| # | Product Name | Stock Units | Unit | Cost Price | Target Sell Price | Margin @ Target | Status |\n`;
        md += `|---|---|---|---|---|---|---|---|\n`;
        products.forEach((p, idx) => {
          const margin = (p.targetSellingPrice || 0) - (p.costPrice || 0);
          md += `| ${idx + 1} | **${p.name}** | ${p.units || 0} | ${p.unit || "Quintal"} | ₹${p.costPrice || 0} | ₹${p.targetSellingPrice || 0} | **+₹${margin}** | \`${p.status || "ai-ready"}\` |\n`;
        });
        md += `\n### 💡 Strategic Commercial Recommendations\n`;
        md += `1. **Priority Stock Liquidation:** Products with higher unit margins (e.g. *${products[0]?.name || "Primary Product"}*) should be prioritized for bulk wholesale distribution.\n`;
        md += `2. **B2B Buyer Matching:** All ${products.length} registered products are commercial-ready for automated outreach and price intelligence.\n`;
        md += `3. **Action:** Click below to explore active wholesale opportunities or discover new regional buyers.`;
        return md;
      };

      let inventoryAnalysis = "";
      try {
        const ai = getAIProvider();
        const aiPromise = ai.chat([
          {
            role: "system",
            content: `You are NOVA, the autonomous AI Sales & Commerce OS agent.
Provide a clear, highly structured, professional commercial inventory evaluation based on the user's registered business products and inventory items.
Business Context: ${activeCtx.businessDescription || activeCtx.businessType} (Location: ${activeCtx.primaryLocation?.city || "India"})
Products in Catalog: ${JSON.stringify(
              products.map((p) => ({
                name: p.name,
                units: p.units,
                unit: p.unit,
                costPrice: p.costPrice,
                targetSellingPrice: p.targetSellingPrice,
                minSellingPrice: p.minSellingPrice,
                status: p.status,
              })),
            )}

Format your answer cleanly in markdown with a summary table, margin highlights, and recommended buyer matching actions.`,
          },
          { role: "user", content: rawPrompt },
        ]);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("AI timeout")), 4000),
        );

        const aiRes: any = await Promise.race([aiPromise, timeoutPromise]);
        if (aiRes?.content) inventoryAnalysis = aiRes.content;
      } catch (err: any) {
        console.warn("[runWorkflow] Fast inventory analysis AI fallback:", err.message);
      }

      if (!inventoryAnalysis) {
        inventoryAnalysis = buildDirectInventoryAnalysis();
      }

      await prisma.aiWorkflow.upsert({
        where: { id: workflowId },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        create: {
          id: workflowId,
          workspaceId,
          userRequest: input.userRequest,
          locationScope: "INDIA",
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await prisma.activityEvent
        .create({
          data: {
            workflowId,
            type: "FINAL_ANSWER",
            data: {
              answer: inventoryAnalysis,
              userQuery: rawPrompt,
            },
          },
        })
        .catch(console.error);

      workflowEvents.emitProgress({
        workflowId,
        stage: "workflow_completed",
        stepName: inventoryAnalysis,
        completedSteps: 3,
        totalSteps: 3,
        details: {
          finalAnswer: inventoryAnalysis,
          userQuery: rawPrompt,
        },
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // 3. OUTREACH PREPARATION INTENT RECOGNITION
    const isOutreachCommand =
      userPrompt.includes("outreach") ||
      userPrompt.includes("prepare personalized") ||
      userPrompt.includes("draft email") ||
      userPrompt.includes("send proposal") ||
      userPrompt.includes("prepare sales");

    if (isOutreachCommand) {
      console.log(
        `[runWorkflow] Detected OUTREACH PREPARATION command: "${input.userRequest}"`,
      );

      workflowEvents.emitProgress({
        workflowId,
        stage: "workflow_started",
        stepName: "Initializing target account research...",
        completedSteps: 1,
        totalSteps: 4,
        timestamp: new Date().toISOString(),
      });

      // Extract quoted target name or clean search term
      const quotedMatch = input.userRequest.match(/["']([^"']+)["']/);
      let targetName = quotedMatch ? quotedMatch[1] : input.userRequest;
      targetName = targetName
        .replace(
          /prepare|personalized|sales|outreach|for|opportunity|lead|:|"/gi,
          "",
        )
        .trim();

      // Find Opportunity or Lead matching targetName
      let opportunity = await prisma.opportunity.findFirst({
        where: {
          workspaceId,
          OR: [
            { companyName: { contains: targetName, mode: "insensitive" } },
            { title: { contains: targetName, mode: "insensitive" } },
          ],
        },
      });

      if (!opportunity) {
        opportunity = await prisma.opportunity.findFirst({
          where: { workspaceId },
          orderBy: { opportunityScore: "desc" },
        });
      }

      let lead = await prisma.lead.findFirst({
        where: {
          workspaceId,
          OR: [
            { name: { contains: targetName, mode: "insensitive" } },
            ...(opportunity ? [{ name: opportunity.companyName || "" }] : []),
          ],
        },
      });

      if (!lead && opportunity) {
        lead = await prisma.lead.create({
          data: {
            workspaceId,
            name:
              opportunity.companyName ||
              opportunity.title ||
              "Qualified Opportunity",
            website: opportunity.website,
            publicEmail: opportunity.publicEmail,
            phone: opportunity.phone,
            industry: opportunity.category || "Wholesale Trade",
            location: opportunity.city || opportunity.country,
            matchScore: opportunity.opportunityScore || 90,
            status: "QUALIFIED",
          },
        });
      }

      const ai = getAIProvider();
      const targetCompany =
        opportunity?.companyName || lead?.name || targetName || "B2B Buyer";
      const targetProduct =
        opportunity?.productName || "Stainless Steel Water Bottles";

      const prompt = `
        You are NOVA, an expert B2B AI Sales Agent.
        Generate a highly compelling, personalized B2B sales outreach email for:
        Target Company: ${targetCompany}
        Location: ${opportunity?.city || "India"}
        Product Offered: ${targetProduct}
        Key Match Reason: ${opportunity?.reason || "Verified wholesale buyer"}

        Respond with JSON format only:
        {
          "subject": "Clear compelling subject line",
          "body": "Professional email body text with clear call-to-action for bulk procurement quote",
          "personalizationReason": "Why this proposal is tailored for this buyer"
        }
      `;

      let parsed = {
        subject: `Bulk Procurement Offer: ${targetProduct} for ${targetCompany}`,
        body: `Dear Procurement Team at ${targetCompany},\n\nWe noticed your active commercial presence in ${opportunity?.city || "India"}. We are a verified bulk supplier of high-grade ${targetProduct} offering factory-direct commercial terms and volume discounts.\n\nWe would welcome the opportunity to submit a customized commercial quote for your bulk procurement needs.\n\nBest regards,\nNOVA Sales Workspace`,
        personalizationReason: `Tailored proposal generated for ${targetCompany} based on verified commercial procurement signals.`,
      };

      try {
        const message = await ai.chat([{ role: "user", content: prompt }]);
        const completion = message.content || "";
        const jsonStr = completion.substring(
          completion.indexOf("{"),
          completion.lastIndexOf("}") + 1,
        );
        const aiParsed = JSON.parse(jsonStr);
        if (aiParsed.subject && aiParsed.body) {
          parsed = aiParsed;
        }
      } catch (aiErr) {
        console.warn("[runWorkflow] AI draft generation fallback:", aiErr);
      }

      // Create Outreach Message draft
      const outreach = await prisma.outreachMessage.create({
        data: {
          workspaceId,
          leadId: lead?.id || null,
          opportunityId: opportunity?.id || null,
          subject: parsed.subject,
          body: parsed.body,
          personalizationReason: parsed.personalizationReason,
          status: "PENDING_APPROVAL",
        },
      });

      // Sync to Linked Deal & Conversation Thread
      await syncOutreachToConversationAndDeal(outreach.id, workspaceId);

      workflowEvents.emitProgress({
        workflowId,
        stage: "leads_saved",
        stepName: "Outreach draft & linked deal updated",
        completedSteps: 3,
        totalSteps: 4,
        details: { count: 1 },
        timestamp: new Date().toISOString(),
      });

      // Complete workflow DB status
      await prisma.aiWorkflow.upsert({
        where: { id: workflowId },
        update: {
          status: "COMPLETED",
          discoveredCount: 1,
          qualifiedCount: 1,
          completedAt: new Date(),
        },
        create: {
          id: workflowId,
          workspaceId,
          userRequest: input.userRequest,
          locationScope: "INDIA",
          status: "COMPLETED",
          discoveredCount: 1,
          qualifiedCount: 1,
          completedAt: new Date(),
        },
      });

      workflowEvents.emitProgress({
        workflowId,
        stage: "workflow_completed",
        stepName: "Analysis & outreach preparation complete",
        completedSteps: 4,
        totalSteps: 4,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    // 3. DYNAMIC MULTI-SOURCE B2B DISCOVERY WITH RESOLVED ACTIVE BUSINESS CONTEXT
    const activeCtx =
      await activeBusinessContextService.resolveContext(workspaceId);
    const strategy =
      businessAdaptationStrategyService.deriveStrategy(activeCtx);

    const products = await prisma.product.findMany({ where: { workspaceId } });
    const targetProduct = input.productId
      ? products.find((p) => p.id === input.productId) || products[0]
      : products[0];

    // Dynamically derive target product name from active product, resolved context, or user request
    let targetProductName = targetProduct?.name;
    if (!targetProductName || targetProductName === "Wholesale B2B Goods") {
      targetProductName =
        activeCtx.products[0] ||
        activeCtx.businessType ||
        input.userRequest ||
        "B2B Commodity";
    }

    const targetProductDescription =
      targetProduct?.description ||
      activeCtx.businessDescription ||
      `${targetProductName} wholesale commercial supply`;

    // Detect nearby / local area intent or city names in user request
    const isNearbyRequest =
      activeCtx.operatingScope === "LOCAL" ||
      activeCtx.operatingScope === "CITY" ||
      userPrompt.includes("nearby") ||
      userPrompt.includes("near me") ||
      userPrompt.includes("meri area") ||
      userPrompt.includes("paas ke") ||
      userPrompt.includes("pass ke") ||
      userPrompt.includes("local");

    // Extract explicit Indian cities if present in rawPrompt
    const commonCities = [
      "Ghaziabad",
      "Delhi",
      "Noida",
      "Gurgaon",
      "Gorakhpur",
      "Mumbai",
      "Bangalore",
      "Jaipur",
      "Surat",
      "Kolkata",
      "Pune",
      "Ahmedabad",
      "Hyderabad",
      "Chennai",
      "Chandigarh",
      "Lucknow",
      "Indore",
      "Kanpur",
    ];
    const foundCity = commonCities.find((city) =>
      rawPrompt.toLowerCase().includes(city.toLowerCase()),
    );

    const primaryCity =
      activeCtx.primaryLocation?.city ||
      activeCtx.primaryLocation?.label ||
      foundCity ||
      input.customLocation ||
      null;
    const targetCitiesList = primaryCity ? [primaryCity] : [];

    // Synthesize search keywords incorporating business target buyer profiles dynamically (never hardcoded!)
    const searchKeywordsList = Array.from(
      new Set([
        targetProductName,
        activeCtx.industry,
        ...activeCtx.targetBuyerProfiles,
        ...activeCtx.searchKeywords,
        ...(isNearbyRequest && primaryCity
          ? [`supplier in ${primaryCity}`, `local business in ${primaryCity}`]
          : []),
      ]),
    ).filter(Boolean);

    await hermesBuyerResearchAgentService.researchBuyers(
      workspaceId,
      input.userRequest || "Find B2B buyers",
      workflowId,
    );
  } catch (err: any) {
    console.error("[runWorkflow error]", err);
    workflowEvents.emitProgress({
      workflowId,
      stage: "workflow_failed",
      stepName: "Workflow execution failed",
      completedSteps: 0,
      totalSteps: 4,
      details: { error: err.message },
      timestamp: new Date().toISOString(),
    });
  }
}

export default router;
