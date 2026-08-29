import {
  hermesSessionManager,
  HermesMessage,
} from "./hermes-session-manager.service";
import { logInfo, logError } from "../../utils/logger";

export interface AgentTaskRequest {
  workspaceId: string;
  userId?: string;
  userCommand: string;
  conversationId?: string;
  currentPage?: string;
  selectedEntityType?: "opportunity" | "deal" | "product" | "lead";
  selectedEntityId?: string;
}

export interface AgentTaskResult {
  status: "COMPLETED" | "PARTIAL" | "APPROVAL_REQUIRED" | "FAILED";
  message: string;
  reasoningSummary: string;
  actionsTaken: string[];
  sessionName?: string;
  durationMs?: number;
  findings?: any;
  requiresApproval?: boolean;
  approvalRequest?: any;
  sources?: any[];
}

export class HermesBrainService {
  /**
   * Central entry point: sends user message to the persistent native Hermes session.
   *
   * Does NOT inject full catalog, opportunity list, or forced schemas.
   * Hermes retrieves what it needs via MCP tools.
   */
  public async executeTask(
    request: AgentTaskRequest,
  ): Promise<AgentTaskResult> {
    const {
      workspaceId,
      userCommand,
      conversationId,
      selectedEntityType,
      selectedEntityId,
      currentPage,
    } = request;

    logInfo(
      `[HermesBrain] Dispatching to native Hermes session for workspace ${workspaceId}`,
    );
    logInfo(`[HermesBrain] UserMessage: "${userCommand}"`);

    // Build the minimal message envelope
    const msg: HermesMessage = {
      workspaceId,
      conversationId: conversationId || `default-${workspaceId}`,
      userMessage: userCommand,
      currentPage,
    };

    if (selectedEntityType && selectedEntityId) {
      msg.activeEntity = {
        type: selectedEntityType as any,
        id: selectedEntityId,
      };
    }

    try {
      const response = await hermesSessionManager.sendMessage(msg);

      return {
        status: "COMPLETED",
        message: response.text,
        reasoningSummary: `Native Hermes session "${response.sessionName}" completed in ${response.durationMs}ms.`,
        actionsTaken: [
          "Dispatched to persistent native Hermes session",
          "Hermes autonomously reasoned and used MCP tools as needed",
        ],
        sessionName: response.sessionName,
        durationMs: response.durationMs,
      };
    } catch (err: any) {
      logError(`[HermesBrain] Session execution failed:`, err);
      return {
        status: "FAILED",
        message: `Agent session failed: ${err.message}`,
        reasoningSummary: "Process execution error or timeout.",
        actionsTaken: ["Attempted Hermes session dispatch"],
      };
    }
  }

  /**
   * Health check for the native Hermes runtime.
   */
  public async healthCheck() {
    return hermesSessionManager.healthCheck();
  }
}

export const hermesBrainService = new HermesBrainService();
