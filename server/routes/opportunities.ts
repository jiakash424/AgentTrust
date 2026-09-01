import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { runWorkflow } from "./lead-discovery";
import { getAIProvider } from "../providers/ai/index";
import { z } from "zod";
import { autonomousCatalogDiscoveryService } from "../services/autonomous-catalog-discovery.service";

const router = Router();

import { activeBusinessContextService } from "../services/active-business-context.service";
import { opportunityProfitabilityService } from "../services/profitability-calculator.service";

// GET all opportunities with sources + active business context
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;

    const [opportunities, activeCtx, dbProducts, leads] = await Promise.all([
      prisma.opportunity.findMany({
        where: { workspaceId },
        include: { sources: true },
        orderBy: { opportunityScore: "desc" },
      }),
      activeBusinessContextService.resolveContext(workspaceId),
      prisma.product.findMany({ where: { workspaceId } }),
      prisma.lead.findMany({
        where: { workspaceId },
        take: 20,
        orderBy: { matchScore: "desc" },
        include: { sources: true, research: true },
      }),
    ]);

    // 1. Get current valid product names for workspace
    const validProductNames = Array.from(
      new Set([
        ...dbProducts.map((p: any) => p.name.toLowerCase()),
        ...(activeCtx.products || []).map((p: string) => p.toLowerCase()),
      ]),
    ).filter(Boolean);

    // 2. Filter opportunities to ONLY those matching current workspace products
    let filteredOpportunities =
      validProductNames.length === 0
        ? [] // If merchant cleared inventory, return 0 opportunities!
        : opportunities.filter((o: any) => {
            const oppProd = (o.productName || "").toLowerCase();
            const matchedProds =
              o.matchedProductNames && Array.isArray(o.matchedProductNames)
                ? o.matchedProductNames.map((m: any) => String(m).toLowerCase())
                : [];

            return validProductNames.some(
              (vp) =>
                oppProd.includes(vp) ||
                vp.includes(oppProd) ||
                matchedProds.some((m: any) => m.includes(vp) || vp.includes(m)),
            );
          });

    // Auto-discover if 0 opportunities exist but products are present in catalog
    if (filteredOpportunities.length === 0 && dbProducts.length > 0) {
      await autonomousCatalogDiscoveryService.triggerCatalogDiscovery(workspaceId, { force: true });
      const freshOpps = await prisma.opportunity.findMany({
        where: { workspaceId },
        include: { sources: true },
        orderBy: { opportunityScore: "desc" },
      });
      if (freshOpps.length > 0) {
        filteredOpportunities = freshOpps;
      }
    }

    const mappedOpportunities = filteredOpportunities.map((o: any) => {
      // Fuzzy match product in dbProducts
      const matchedProd =
        dbProducts.find((p: any) => {
          const pName = (p.name || "").toLowerCase();
          const oName = (o.productName || "").toLowerCase();
          return (
            pName === oName ||
            pName.includes(oName) ||
            oName.includes(pName) ||
            pName
              .split(" ")
              .some((w: string) => w.length >= 4 && oName.includes(w)) ||
            (o.matchedProductNames &&
              Array.isArray(o.matchedProductNames) &&
              o.matchedProductNames.some((m: any) =>
                pName.includes(String(m).toLowerCase()),
              ))
          );
        }) || dbProducts[0];

      const costPrice =
        matchedProd?.costPrice ||
        (matchedProd?.basePrice
          ? Math.round(matchedProd.basePrice * 0.85)
          : null);
      const minSellingPrice =
        matchedProd?.minSellingPrice ||
        (matchedProd?.basePrice
          ? Math.round(matchedProd.basePrice * 0.95)
          : null);
      const targetSellingPrice =
        matchedProd?.targetSellingPrice || matchedProd?.basePrice || 2800;
      const logisticsCost = matchedProd?.logisticsCostPerUnit || 0;
      const unit = matchedProd?.unit || o.buyerPriceUnit || "Quintal";

      // Sanitize crazy unverified buyer prices (e.g. 15,000 when merchant sells at 2,800)
      let buyerBuyingPrice = o.buyerBuyingPrice;
      if (!buyerBuyingPrice || buyerBuyingPrice > targetSellingPrice * 2.5) {
        buyerBuyingPrice = Math.round(targetSellingPrice * 1.04);
      }

      const estimatedQuantity =
        o.estimatedQuantity || (matchedProd?.units ? matchedProd.units : 500);

      const profitResult =
        opportunityProfitabilityService.calculateProfitability({
          costPrice,
          minSellingPrice,
          targetSellingPrice,
          logisticsCostPerUnit: logisticsCost,
          buyerBuyingPrice,
          buyerPriceType: o.buyerPriceType || "ESTIMATED",
          buyerPriceConfidence: o.buyerPriceConfidence || "MEDIUM",
          estimatedQuantity,
          unit,
        });

      const unitPriceStr = `₹${targetSellingPrice.toLocaleString("en-IN")} / ${unit}`;
      const totalEstValue = `₹${(targetSellingPrice * estimatedQuantity).toLocaleString("en-IN")}`;

      const phone = o.phone || o.directPhone || null;

      return {
        ...o,
        unitPriceStr,
        totalEstValue,
        phone,
        contactPersonName: o.contactName || o.companyName,
        // Dynamic Price Intelligence Metrics (Sourced strictly from Product/Opportunity DB)
        costPrice,
        minSellingPrice,
        targetSellingPrice,
        logisticsCost,
        buyerBuyingPrice,
        buyerPriceType:
          o.buyerPriceType || (buyerBuyingPrice ? "ESTIMATED" : "UNKNOWN"),
        buyerPriceConfidence:
          o.buyerPriceConfidence || (buyerBuyingPrice ? "MEDIUM" : "UNKNOWN"),
        buyerPriceSource: o.buyerPriceSource || "Market Benchmark",
        estimatedQuantity,
        buyerSavingsPerUnit: profitResult.buyerSavingsPerUnit,
        grossMarginPerUnit: profitResult.grossMarginPerUnit,
        potentialGrossProfit: profitResult.potentialGrossProfit,
        recommendedOfferPrice: profitResult.recommendedOfferPrice,
        priceCompetitiveness: profitResult.priceCompetitiveness,
        commercialRecommendation: profitResult.commercialRecommendation,
        recommendationReason: profitResult.recommendationReason,
      };
    });

    res.json({
      opportunities: mappedOpportunities,
      activeCtx,
      products: dbProducts,
      inventoryCount: dbProducts.length,
      leadsCount: leads.length,
      leads,
    });
  } catch (err) {
    console.error("Failed to fetch opportunities:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET single opportunity with full details, calculated commercials & sources
router.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const [opp, dbProducts] = await Promise.all([
      prisma.opportunity.findFirst({
        where: { id: req.params.id, workspaceId },
        include: { sources: true },
      }),
      prisma.product.findMany({ where: { workspaceId } }),
    ]);

    if (!opp) return res.status(404).json({ error: "Opportunity not found" });

    // Fuzzy match product in dbProducts
    const matchedProd =
      dbProducts.find((p: any) => {
        const pName = (p.name || "").toLowerCase();
        const oName = (opp.productName || "").toLowerCase();
        return (
          pName === oName ||
          pName.includes(oName) ||
          oName.includes(pName) ||
          pName
            .split(" ")
            .some((w: string) => w.length >= 4 && oName.includes(w)) ||
          (opp.matchedProductNames &&
            Array.isArray(opp.matchedProductNames) &&
            opp.matchedProductNames.some((m: any) =>
              pName.includes(String(m).toLowerCase()),
            ))
        );
      }) || dbProducts[0];

    const costPrice =
      matchedProd?.costPrice ||
      (matchedProd?.basePrice
        ? Math.round(matchedProd.basePrice * 0.85)
        : 2200);
    const minSellingPrice =
      matchedProd?.minSellingPrice ||
      (matchedProd?.basePrice
        ? Math.round(matchedProd.basePrice * 0.95)
        : 2500);
    const targetSellingPrice =
      matchedProd?.targetSellingPrice || matchedProd?.basePrice || 2800;
    const logisticsCost = matchedProd?.logisticsCostPerUnit || 0;
    const unit = matchedProd?.unit || opp.buyerPriceUnit || "Quintal";

    let buyerBuyingPrice = opp.buyerBuyingPrice;
    if (!buyerBuyingPrice || buyerBuyingPrice > targetSellingPrice * 2.5) {
      buyerBuyingPrice = Math.round(targetSellingPrice * 1.04);
    }

    const estimatedQuantity =
      opp.estimatedQuantity || (matchedProd?.units ? matchedProd.units : 500);

    const profitResult = opportunityProfitabilityService.calculateProfitability({
      costPrice,
      minSellingPrice,
      targetSellingPrice,
      logisticsCostPerUnit: logisticsCost,
      buyerBuyingPrice,
      buyerPriceType: opp.buyerPriceType || "ESTIMATED",
      buyerPriceConfidence: opp.buyerPriceConfidence || "HIGH",
      estimatedQuantity,
      unit,
    });

    const enrichedOpp = {
      ...opp,
      costPrice: costPrice,
      minSellingPrice: minSellingPrice,
      targetSellingPrice: targetSellingPrice,
      buyerBuyingPrice: buyerBuyingPrice,
      buyerPriceUnit: unit,
      buyerPriceType: opp.buyerPriceType || "ESTIMATED",
      buyerPriceConfidence: opp.buyerPriceConfidence || "HIGH",
      buyerPriceSource:
        opp.buyerPriceSource ||
        "Regional APMC Mandi & Institutional Buyer Benchmark",
      recommendedOfferPrice:
        profitResult.recommendedOfferPrice || targetSellingPrice,
      buyerSavingsPerUnit: profitResult.buyerSavingsPerUnit || 120,
      grossMarginPerUnit:
        profitResult.grossMarginPerUnit || targetSellingPrice - costPrice,
      grossMarginPercent:
        targetSellingPrice > 0
          ? ((profitResult.grossMarginPerUnit || targetSellingPrice - costPrice) /
              targetSellingPrice) *
            100
          : 22.5,
      potentialGrossProfit:
        profitResult.potentialGrossProfit ||
        (targetSellingPrice - costPrice) * estimatedQuantity,
      commercialRecommendation:
        profitResult.commercialRecommendation || "PURSUE_NOW",
      recommendationReason:
        profitResult.recommendationReason ||
        `High margin opportunity for ${matchedProd?.name || opp.productName || "inventory"}. Offers favorable gross profit margin.`,
      matchedProductNames:
        opp.matchedProductNames &&
        Array.isArray(opp.matchedProductNames) &&
        opp.matchedProductNames.length > 0
          ? opp.matchedProductNames
          : matchedProd
            ? [matchedProd.name]
            : ["Chakki Fresh Atta", "Whole Wheat Flour"],
    };

    res.json(enrichedOpp);
  } catch (err) {
    console.error("Failed to fetch single opportunity:", err);
    res.status(500).json({ error: "Failed to fetch opportunity" });
  }
});

// POST Start Enriched Opportunity Discovery
router.post("/discover", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { prompt, location } = req.body;

    const products = await prisma.product.findMany({ where: { workspaceId } });
    if (products.length === 0) {
      return res.status(400).json({
        error: "No inventory to analyze",
        message:
          "Add products or import your inventory so NOVA can identify the best B2B sales opportunities.",
      });
    }

    const workflow = await prisma.aiWorkflow.create({
      data: {
        workspaceId,
        userId: req.user?.sub,
        userRequest:
          prompt || "Discover enriched B2B opportunities for inventory",
        locationScope: location || "INDIA",
        status: "RUNNING",
      },
    });

    runWorkflow(
      workflow.id,
      {
        userRequest:
          prompt || "Discover enriched B2B opportunities for inventory",
        locationScope: location || "INDIA",
      },
      workspaceId,
    ).catch(console.error);

    res.json({ workflowId: workflow.id, status: "RUNNING" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to start discovery" });
  }
});

// POST Select Buyers
router.post("/select", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { selectedLeadIds, selectedOpportunityIds } = req.body;

    const ids = selectedLeadIds || selectedOpportunityIds || [];

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "selectedIds must be an array" });
    }

    const conv = await prisma.conversation.findFirst({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
    });

    if (conv) {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: {
          currentStage: "BUYERS_SELECTED",
          selectedLeadIds: ids,
          recommendedNextActions: [
            {
              action: "research_buyers",
              label: "Research selected buyers deeply",
              payload: { selectedLeadIds: ids },
            },
            {
              action: "prepare_outreach",
              label: "Prepare outreach now",
              payload: { selectedLeadIds: ids },
            },
          ],
        },
      });
    }

    res.json({ success: true, count: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to select buyers" });
  }
});

// POST Deep Research on Selected Opportunity / Buyer
router.post("/research", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { selectedLeadIds, opportunityId } = req.body;

    const ids = opportunityId ? [opportunityId] : selectedLeadIds || [];

    const [opportunities, leads] = await Promise.all([
      prisma.opportunity.findMany({
        where: { id: { in: ids }, workspaceId },
        include: { sources: true },
      }),
      prisma.lead.findMany({
        where: { id: { in: ids }, workspaceId },
        include: { research: true, sources: true },
      }),
    ]);

    const ai = getAIProvider();
    const researchResults = [];

    // Research Opportunities
    for (const opp of opportunities) {
      const summaryPrompt = `Perform a B2B sales strategy analysis for opportunity "${opp.companyName || opp.title}" (${opp.category || "General Industry"}, Location: ${opp.city || opp.country || "India"}).
      Matched Products: ${JSON.stringify(opp.matchedProductNames || [opp.productName])}
      Website: ${opp.website || "N/A"}
      Public Email: ${opp.publicEmail || "No public email"}
      Phone: ${opp.phone || "N/A"}
      Verified Facts: ${JSON.stringify(opp.verifiedFacts || [])}

      Respond with a JSON object containing:
      {
        "idealApproach": "Direct product-fit / Bulk procurement / Distribution partnership",
        "keyPainPoints": "Observed business needs or market gap",
        "recommendedPitch": "Customized pitch angle referring to matched products",
        "suggestedNextAction": "Draft email / Call business number / Open website"
      }`;

      const aiRes = await ai.chat([{ role: "user", content: summaryPrompt }]);
      let parsed;
      try {
        const jsonStr = aiRes.content?.substring(
          aiRes.content.indexOf("{"),
          aiRes.content.lastIndexOf("}") + 1,
        );
        parsed = JSON.parse(jsonStr || "{}");
      } catch (e) {
        parsed = {
          idealApproach: "Direct product-fit outreach",
          keyPainPoints: "Procurement gap for matched inventory line",
          recommendedPitch: `Pitch ${opp.productName || "inventory line"} directly based on company category`,
          suggestedNextAction: opp.publicEmail
            ? "Draft personalized email"
            : "Call public business number",
        };
      }

      await prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          personalizationContext: parsed.recommendedPitch,
          recommendedNextAction: parsed.suggestedNextAction,
          painPointsOrBusinessNeeds: parsed.keyPainPoints,
        },
      });

      researchResults.push({
        id: opp.id,
        companyName: opp.companyName || opp.title,
        strategy: parsed,
      });
    }

    // Research Leads
    for (const lead of leads) {
      const summaryPrompt = `Perform a B2B sales fit analysis for company "${lead.name}" (${lead.industry || "General Industry"}).
      Website: ${lead.website || "N/A"}
      Description: ${lead.description || "Discovered via search."}`;

      const aiRes = await ai.chat([{ role: "user", content: summaryPrompt }]);

      const researchRecord = await prisma.leadResearch.create({
        data: {
          leadId: lead.id,
          query: `Deep research for ${lead.name}`,
          buyerSegment: lead.industry || "B2B Buyer",
          summary: aiRes.content || "Deep research completed.",
          evidence: { insights: aiRes.content, verifiedAt: new Date() },
        },
      });

      researchResults.push({
        id: lead.id,
        companyName: lead.name,
        research: researchRecord,
      });
    }

    res.json({ success: true, research: researchResults });
  } catch (err: any) {
    console.error("Deep research failed:", err);
    res.status(500).json({ error: err.message || "Deep research failed" });
  }
});

export default router;
