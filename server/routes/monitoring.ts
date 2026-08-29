import { Router } from "express";
import { prisma } from "../db";
import { verifyToken } from "../middleware/auth";
import { opportunityMonitoringService } from "../services/monitoring/opportunity-monitoring.service";
import { sseManager } from "../services/monitoring/notification.service";
import { z } from "zod";

const router = Router();

// GET /api/monitoring/status — Fetch monitor status and settings
router.get("/status", verifyToken, async (req: any, res: any) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId)
      return res.status(400).json({ error: "x-workspace-id header required" });

    let monitor = await prisma.opportunityMonitor.findUnique({
      where: { workspaceId },
      include: {
        runs: {
          take: 5,
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!monitor) {
      monitor = await prisma.opportunityMonitor.create({
        data: {
          workspaceId,
          enabled: true,
          frequencyMinutes: 60,
          status: "IDLE",
          nextRunAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        include: {
          runs: true,
        },
      });
    }

    const unreadNotificationsCount = await prisma.opportunityNotification.count(
      {
        where: { workspaceId, read: false },
      },
    );

    res.json({
      success: true,
      monitor,
      unreadNotificationsCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/monitoring/toggle — Pause/Resume Monitor
router.post("/toggle", verifyToken, async (req: any, res: any) => {
  try {
    const workspaceId = req.workspaceId;
    const { enabled } = req.body;

    const monitor = await prisma.opportunityMonitor.upsert({
      where: { workspaceId },
      update: {
        enabled: Boolean(enabled),
        status: enabled ? "IDLE" : "PAUSED",
        nextRunAt: enabled ? new Date(Date.now() + 60 * 60 * 1000) : null,
      },
      create: {
        workspaceId,
        enabled: Boolean(enabled),
        status: enabled ? "IDLE" : "PAUSED",
        nextRunAt: enabled ? new Date(Date.now() + 60 * 60 * 1000) : null,
      },
    });

    res.json({ success: true, monitor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/monitoring/settings — Update frequency & preferences
router.post("/settings", verifyToken, async (req: any, res: any) => {
  try {
    const workspaceId = req.workspaceId;
    const schema = z.object({
      frequencyMinutes: z.number().min(15).max(1440).optional(),
      inAppNotifyEnabled: z.boolean().optional(),
      browserPushEnabled: z.boolean().optional(),
      whatsAppNotifyEnabled: z.boolean().optional(),
      minMatchScoreAlert: z.number().min(0).max(100).optional(),
      notifyNewOnly: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    const monitor = await prisma.opportunityMonitor.upsert({
      where: { workspaceId },
      update: {
        ...data,
        nextRunAt: data.frequencyMinutes
          ? new Date(Date.now() + data.frequencyMinutes * 60 * 1000)
          : undefined,
      },
      create: {
        workspaceId,
        enabled: true,
        ...data,
      },
    });

    res.json({ success: true, monitor });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/monitoring/run-now — Trigger manual background run
router.post("/run-now", verifyToken, async (req: any, res: any) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId)
      return res.status(400).json({ error: "x-workspace-id header required" });

    // Execute run in background asynchronously
    opportunityMonitoringService
      .executeMonitoringRun(workspaceId)
      .catch(console.error);

    res.json({
      success: true,
      message: "Autonomous Opportunity Monitor run initiated in background.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/monitoring/history — Fetch run telemetry log
router.get("/history", verifyToken, async (req: any, res: any) => {
  try {
    const workspaceId = req.workspaceId;
    const runs = await prisma.opportunityResearchRun.findMany({
      where: { workspaceId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
    res.json({ success: true, runs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/monitoring/notifications — Fetch in-app notifications
router.get("/notifications", verifyToken, async (req: any, res: any) => {
  try {
    const workspaceId = req.workspaceId;
    const notifications = await prisma.opportunityNotification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    res.json({ success: true, notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/monitoring/notifications/:id/read — Mark notification read
router.post(
  "/notifications/:id/read",
  verifyToken,
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await prisma.opportunityNotification.update({
        where: { id },
        data: { read: true },
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// GET /api/monitoring/events — SSE Stream for real-time in-app alerts
router.get("/events", (req: any, res) => {
  const workspaceId = req.query.workspaceId || req.headers["x-workspace-id"];
  if (!workspaceId) {
    return res.status(400).send("workspaceId query or header required");
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseManager.addClient(workspaceId as string, res);

  res.write(
    `event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`,
  );
});

export default router;
