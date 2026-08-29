import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { matchScore: "desc" },
      include: {
        sources: true,
      },
    });
    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

router.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: {
        id: req.params.id,
        workspaceId: req.workspaceId,
      },
      include: {
        sources: true,
        research: true,
      },
    });
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

export default router;
