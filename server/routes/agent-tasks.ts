import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { agentTaskManagerService } from "../services/agent-task-manager.service";

const router = Router();

// 1. POST /api/agent/tasks - Create and start Hermes agent task
router.post("/tasks", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { userCommand, command, query, targetEntityId } = req.body;
    const prompt = userCommand || command || query || "Find B2B buyers";

    const task = await agentTaskManagerService.createTask(workspaceId, prompt, {
      targetEntityId,
    });

    res.json({
      success: true,
      taskId: task.taskId,
      intent: task.intent,
      status: task.status,
      currentActivity: task.currentActivity,
      startedAt: task.startedAt,
    });
  } catch (err: any) {
    console.error("Failed to create agent task:", err);
    res
      .status(500)
      .json({ error: "Failed to create agent task", message: err.message });
  }
});

// 2. GET /api/agent/tasks/:taskId - Get task execution status & progress
router.get("/tasks/:taskId", requireAuth, async (req: any, res) => {
  try {
    const { taskId } = req.params;
    const task = agentTaskManagerService.getTask(taskId);

    if (!task) {
      return res.status(404).json({ error: "Agent task not found" });
    }

    res.json(task);
  } catch (err: any) {
    console.error("Failed to fetch agent task:", err);
    res.status(500).json({ error: "Failed to fetch agent task" });
  }
});

// 3. POST /api/agent/tasks/:taskId/cancel - Cancel active task safely
router.post("/tasks/:taskId/cancel", requireAuth, async (req: any, res) => {
  try {
    const { taskId } = req.params;
    const cancelled = agentTaskManagerService.cancelTask(taskId);

    if (!cancelled) {
      return res
        .status(404)
        .json({ error: "Task not found or already completed" });
    }

    res.json({ success: true, message: "Task cancelled successfully" });
  } catch (err: any) {
    console.error("Failed to cancel agent task:", err);
    res.status(500).json({ error: "Failed to cancel agent task" });
  }
});

export default router;
