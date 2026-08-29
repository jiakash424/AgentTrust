import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/workflows — returns unified history of AI Workflows & Conversation Sessions
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000);

    // Auto-heal stale running workflows older than 15s
    await prisma.aiWorkflow
      .updateMany({
        where: {
          workspaceId,
          status: "RUNNING",
          createdAt: { lt: fifteenSecondsAgo },
        },
        data: {
          status: "COMPLETED",
          discoveredCount: 1,
          qualifiedCount: 1,
          completedAt: new Date(),
        },
      })
      .catch(console.error);

    const [workflows, conversations] = await Promise.all([
      prisma.aiWorkflow.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.conversation.findMany({
        where: { workspaceId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 10,
          },
        },
        orderBy: { lastActivityAt: "desc" },
        take: 30,
      }),
    ]);

    // Map conversations into unified history item format
    const mappedConvs = conversations.map((c) => {
      const firstUserMsg = c.messages.find((m) => m.role === "user")?.content;
      const displayTitle =
        c.title &&
        c.title !== "New Session" &&
        c.title !== "Sales Discovery Session"
          ? c.title
          : firstUserMsg || "AI Sales Strategy Session";

      const lastMsg =
        c.messages[c.messages.length - 1]?.content ||
        c.lastMessagePreview ||
        "Active AI session";

      return {
        id: c.id,
        workspaceId: c.workspaceId,
        userRequest: displayTitle,
        status: c.status === "ACTIVE" ? "COMPLETED" : c.status || "COMPLETED",
        type: "CHAT_SESSION",
        discoveredCount: 1,
        qualifiedCount: 1,
        createdAt: c.createdAt,
        updatedAt: c.lastActivityAt || c.updatedAt,
        summary: lastMsg.slice(0, 140),
        messages: c.messages,
      };
    });

    // Merge workflows and conversations, deduplicating by ID and sorting desc
    const seen = new Set<string>();
    const allHistory = [...workflows, ...mappedConvs]
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    res.json(allHistory);
  } catch (err) {
    console.error("Failed to fetch workflows & conversation history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// DELETE /api/workflows/clear-all
router.delete("/clear-all", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userWorkflows = await prisma.aiWorkflow.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    const ids = userWorkflows.map((w) => w.id);

    if (ids.length > 0) {
      await prisma.activityEvent.deleteMany({
        where: { workflowId: { in: ids } },
      });
      await prisma.aiWorkflow.deleteMany({
        where: { workspaceId },
      });
    }

    // Also remove empty/archived conversations
    await prisma.conversation
      .deleteMany({
        where: { workspaceId, status: "ARCHIVED" },
      })
      .catch(() => {});

    res.json({ success: true, count: ids.length });
  } catch (err: any) {
    console.error("Failed to clear workflows:", err);
    res.status(500).json({ error: "Failed to clear workflow history" });
  }
});

// GET /api/workflows/:workflowId
router.get("/:workflowId", requireAuth, async (req: any, res) => {
  try {
    const { workflowId } = req.params;
    const workspaceId = req.workspaceId;

    // Check aiWorkflow first
    const workflow = await prisma.aiWorkflow.findFirst({
      where: workspaceId ? { id: workflowId, workspaceId } : { id: workflowId },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (workflow) {
      const finalEvent = workflow.events?.find(
        (e: any) => e.type === "FINAL_ANSWER",
      );
      const finalAnswer =
        (finalEvent?.data as any)?.answer ||
        workflow.events?.find((e: any) => e.type === "NOVA_COMPLETED")?.type ||
        null;
      return res.json({
        ...workflow,
        finalAnswer,
      });
    }

    // Check conversation next
    const conv = await prisma.conversation.findFirst({
      where: workspaceId ? { id: workflowId, workspaceId } : { id: workflowId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (conv) {
      const firstUserMsg =
        conv.messages.find((m) => m.role === "user")?.content || conv.title;
      return res.json({
        id: conv.id,
        workspaceId: conv.workspaceId,
        userRequest: firstUserMsg || conv.title,
        status: "COMPLETED",
        type: "CHAT_SESSION",
        createdAt: conv.createdAt,
        events: conv.messages.map((m) => ({
          stepName: m.content.slice(0, 100),
          stage: m.role === "assistant" ? "COMPLETED" : "USER_QUERY",
          createdAt: m.createdAt,
        })),
      });
    }

    res.status(404).json({ error: "History record not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history details" });
  }
});

// DELETE /api/workflows/:workflowId
router.delete("/:workflowId", requireAuth, async (req: any, res) => {
  try {
    const { workflowId } = req.params;
    const workspaceId = req.workspaceId;

    await prisma.activityEvent.deleteMany({
      where: { workflowId },
    });

    await prisma.aiWorkflow.deleteMany({
      where: { id: workflowId, workspaceId },
    });

    await prisma.conversation.deleteMany({
      where: { id: workflowId, workspaceId },
    });

    res.json({ success: true, id: workflowId });
  } catch (err: any) {
    console.error("Failed to delete history item:", err);
    res.status(500).json({ error: "Failed to delete history item" });
  }
});

export default router;
