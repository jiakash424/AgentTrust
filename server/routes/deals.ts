import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { getAIProvider } from "../providers/ai/index";
import { z } from "zod";

const router = Router();

// GET /api/deals - Fetch all deals for workspace, grouped by stage with real stats
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;

    // Check if workspace has any deals; if not, quickly sync from verified opportunities
    const existingDealsCount = await prisma.deal.count({
      where: { workspaceId },
    });

    if (existingDealsCount === 0) {
      const opportunities = await prisma.opportunity.findMany({
        where: { workspaceId },
        take: 30,
      });

      if (opportunities.length > 0) {
        const dealsData = opportunities.map((opp) => {
          const stage =
            opp.verificationStatus === "VERIFIED" ? "QUALIFIED" : "RESEARCHING";
          const estVal = opp.opportunityScore
            ? opp.opportunityScore * 1500
            : 120000;
          const pName =
            opp.productName ||
            (opp.matchedProductNames && (opp.matchedProductNames as any)[0]) ||
            "Chakki Fresh Atta";

          return {
            workspaceId,
            opportunityId: opp.id,
            title: `Deal - ${opp.companyName || opp.title}`,
            companyName: opp.companyName || opp.title || "Qualified Buyer",
            stage: stage,
            productName: pName,
            matchScore: opp.opportunityScore || 85,
            estimatedQuantity: opp.estimatedQuantity || 100,
            estimatedValue: estVal,
            recommendedNextAction:
              opp.recommendedNextAction || "Prepare personalized outreach",
          };
        });

        await prisma.deal
          .createMany({
            data: dealsData,
          })
          .catch(console.error);
      }
    }

    const deals = await prisma.deal.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      include: {
        opportunity: {
          select: {
            id: true,
            companyName: true,
            publicEmail: true,
            phone: true,
            website: true,
            opportunityScore: true,
            matchedProductNames: true,
          },
        },
        conversations: {
          take: 1,
          orderBy: { lastActivityAt: "desc" },
          include: {
            messages: {
              take: 3,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    // Compute stage counters
    const stageCounts: Record<string, { count: number; totalValue: number }> = {
      RESEARCHING: { count: 0, totalValue: 0 },
      QUALIFIED: { count: 0, totalValue: 0 },
      QUOTE_SENT: { count: 0, totalValue: 0 },
      NEGOTIATING: { count: 0, totalValue: 0 },
      WON: { count: 0, totalValue: 0 },
      LOST: { count: 0, totalValue: 0 },
    };

    deals.forEach((d) => {
      const stageKey = d.stage.toUpperCase();
      if (!stageCounts[stageKey]) {
        stageCounts[stageKey] = { count: 0, totalValue: 0 };
      }
      stageCounts[stageKey].count += 1;
      stageCounts[stageKey].totalValue += d.estimatedValue || 0;
    });

    res.json({
      deals,
      stageCounts,
      totalDeals: deals.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch deals:", error);
    res.status(500).json({ error: error.message || "Failed to fetch deals" });
  }
});

// PATCH /api/deals/:id/stage - Update deal stage
router.patch("/:id/stage", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;
    const workspaceId = req.workspaceId;

    const validStages = [
      "RESEARCHING",
      "QUALIFIED",
      "QUOTE_SENT",
      "NEGOTIATING",
      "WON",
      "LOST",
    ];
    const normalizedStage = (stage || "").toUpperCase();

    if (!validStages.includes(normalizedStage)) {
      return res
        .status(400)
        .json({
          error: `Invalid stage. Must be one of: ${validStages.join(", ")}`,
        });
    }

    const updated = await prisma.deal.updateMany({
      where: { id, workspaceId },
      data: {
        stage: normalizedStage,
        lastActivityAt: new Date(),
      },
    });

    const deal = await prisma.deal.findUnique({ where: { id } });

    res.json({ success: true, deal });
  } catch (error: any) {
    console.error("Failed to update deal stage:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to update deal stage" });
  }
});

export default router;
