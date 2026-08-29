import { Router } from "express";
import { prisma } from "../index";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user?.sub;

    // Mask user ID (show first 4, last 4)
    const maskedUserId = userId
      ? `${userId.substring(0, 4)}***${userId.substring(userId.length - 4)}`
      : "Unknown";

    // Test DB connection and get lead count
    let dbStatus = "connected";
    let leadsCount = 0;

    try {
      leadsCount = await prisma.lead.count({
        where: { workspaceId },
      });
    } catch (err: any) {
      dbStatus = "failed";
      console.error("DB Error in diagnostics:", err);
    }

    res.json({
      DATABASE: dbStatus,
      AUTH: "current request accepted",
      CURRENT_USER_ID: maskedUserId,
      WORKSPACE: workspaceId ? "found" : "not found",
      LEADS_IN_WORKSPACE: leadsCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Diagnostics failed" });
  }
});

export default router;
