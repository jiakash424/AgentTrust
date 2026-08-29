import { prisma } from "../db";
import { hermesSessionManager } from "./ai/hermes-session-manager.service";
import { logInfo, logError } from "../utils/logger";
import { workflowEvents } from "../events/workflow-events";

export type AgentTaskStatus =
  | "QUEUED"
  | "PLANNING"
  | "RESEARCHING"
  | "ANALYZING"
  | "VALIDATING"
  | "PERSISTING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

export type AgentTaskIntent =
  | "STRATEGIC_ADVICE"
  | "BUYER_DISCOVERY"
  | "OPPORTUNITY_ANALYSIS"
  | "LEAD_PRIORITIZATION"
  | "PRICE_ANALYSIS"
  | "OUTREACH_DRAFT"
  | "OUTREACH_SEND"
  | "FIND_SIMILAR"
  | "GENERAL_CHAT";

export interface AgentTaskRecord {
  taskId: string;
  workspaceId: string;
  userCommand: string;
  intent: AgentTaskIntent;
  status: AgentTaskStatus;
  currentActivity: string;
  progressPercent: number;
  results?: any;
  error?: string;
  targetEntityId?: string;
  startedAt: string;
  completedAt?: string;
  cancelled?: boolean;
}

export class AgentTaskManagerService {
  private tasks = new Map<string, AgentTaskRecord>();

  /**
   * Optional intent metadata helper for UI displays.
   * NOTE: This metadata DOES NOT control or gate agent execution.
   */
  public classifyIntent(
    userCommand: string,
    targetEntityId?: string,
  ): AgentTaskIntent {
    const cmd = userCommand.toLowerCase();

    if (
      targetEntityId ||
      cmd.includes("opportunity") ||
      cmd.includes("tell me about")
    ) {
      return "OPPORTUNITY_ANALYSIS";
    }
    if (
      cmd.includes("find buyers") ||
      cmd.includes("buyer") ||
      cmd.includes("search buyers")
    ) {
      return "BUYER_DISCOVERY";
    }
    if (cmd.includes("price") || cmd.includes("rate") || cmd.includes("cost")) {
      return "PRICE_ANALYSIS";
    }
    if (
      cmd.includes("lead") ||
      cmd.includes("prioritize") ||
      cmd.includes("contact first")
    ) {
      return "LEAD_PRIORITIZATION";
    }
    return "STRATEGIC_ADVICE";
  }

  /**
   * Create and launch Hermes Agent Task
   */
  public async createTask(
    workspaceId: string,
    userCommand: string,
    options?: { targetEntityId?: string },
  ): Promise<AgentTaskRecord> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const intent = this.classifyIntent(userCommand, options?.targetEntityId);

    const task: AgentTaskRecord = {
      taskId,
      workspaceId,
      userCommand,
      intent,
      status: "QUEUED",
      currentActivity: "Task queued for execution",
      progressPercent: 0,
      targetEntityId: options?.targetEntityId,
      startedAt: new Date().toISOString(),
    };

    this.tasks.set(taskId, task);

    // Launch background execution asynchronously via the persistent Hermes session
    this.executeTask(task).catch((err) => {
      logError(
        `[AgentTaskManager] Unhandled execution error for task ${taskId}:`,
        err,
      );
      task.status = "FAILED";
      task.error = err.message || "Execution failed";
      task.completedAt = new Date().toISOString();
    });

    return task;
  }

  /**
   * Get current task status and results
   */
  public getTask(taskId: string): AgentTaskRecord | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Cancel an active task
   */
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.cancelled = true;
    task.status = "CANCELLED";
    task.currentActivity = "Task cancelled by user";
    task.completedAt = new Date().toISOString();

    // Also cancel the Hermes process
    hermesSessionManager.cancel(task.taskId);
    return true;
  }

  /**
   * Central Autonomous Task Execution — dispatches to native Hermes session.
   * Hermes decides what tools to call and what research to perform.
   */
  private async executeTask(task: AgentTaskRecord): Promise<void> {
    logInfo(
      `[AgentTaskManager] Executing Task '${task.taskId}' via native Hermes session...`,
    );

    const updateStatus = (
      stage: string,
      activity: string,
      stepNumber: number,
    ) => {
      task.status = stage as any;
      task.currentActivity = activity;
      task.progressPercent = stepNumber * 20;

      workflowEvents.emitProgress({
        workflowId: task.taskId,
        stage,
        stepName: activity,
        completedSteps: stepNumber,
        totalSteps: 5,
        timestamp: new Date().toISOString(),
      });
    };

    updateStatus("HERMES_STARTED", "Initializing NOVA Autonomous Agent...", 1);

    if (task.cancelled) return;

    updateStatus(
      "HERMES_RESEARCHING",
      "Consulting AgentTrust MCP tools & analyzing catalog...",
      2,
    );

    try {
      // Build entity reference if target entity exists
      let activeEntity:
        | { type: "opportunity" | "product" | "lead" | "deal"; id: string }
        | undefined;
      if (task.targetEntityId) {
        // Try to determine entity type by checking DB
        const opp = await prisma.opportunity.findUnique({
          where: { id: task.targetEntityId },
        });
        if (opp) {
          activeEntity = { type: "opportunity", id: task.targetEntityId };
        } else {
          const product = await prisma.product.findUnique({
            where: { id: task.targetEntityId },
          });
          if (product) {
            activeEntity = { type: "product", id: task.targetEntityId };
          }
        }
      }

      // Dispatch to persistent Hermes session — exact user command, no prompt injection
      const response = await hermesSessionManager.sendMessage({
        workspaceId: task.workspaceId,
        conversationId: `task-${task.taskId}`,
        userMessage: task.userCommand,
        activeEntity,
      });

      if (task.cancelled) return;

      updateStatus("HERMES_COMPLETED", "NOVA task execution completed", 5);
      task.results = {
        answer: response.text,
        sessionName: response.sessionName,
        durationMs: response.durationMs,
      };
      task.completedAt = new Date().toISOString();
    } catch (err: any) {
      logError(
        `[AgentTaskManager] Error during Hermes session for task ${task.taskId}:`,
        err,
      );
      task.status = "FAILED";
      task.error = err.message || "Hermes session execution failed";
      task.completedAt = new Date().toISOString();
    }
  }
}

export const agentTaskManagerService = new AgentTaskManagerService();
