import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { aiOrchestratorService } from "../services/ai-orchestrator.service";
import { AIEntityType, AIMode } from "../types/ai-request-contract";

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

// 2. POST /api/ai/opportunity-chat - Explicit Opportunity AI Endpoint
router.post("/opportunity-chat", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user?.sub;
    const { opportunityId, message, conversationId } = req.body;

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
    const statusCode =
      err.code === "NO_ENTITY_CONTEXT" || err.code === "ENTITY_NOT_FOUND"
        ? 400
        : 500;
    res.status(statusCode).json({
      error: err.code || "OPPORTUNITY_CHAT_ERROR",
      message: err.message || "Failed to process opportunity AI request.",
    });
  }
});

export default router;
