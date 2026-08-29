import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../../db";
import { workflowEvents } from "../../events/workflow-events";
import { logInfo, logWarn, logError } from "../../utils/logger";

// ─── Types ───────────────────────────────────────────────────────────────

export interface HermesMessage {
  workspaceId: string;
  conversationId: string;
  userMessage: string;
  activeEntity?: {
    type: "opportunity" | "product" | "lead" | "deal";
    id: string;
  };
  currentPage?: string;
}

export interface HermesResponse {
  text: string;
  sessionName: string;
  durationMs: number;
}

// ─── Session Manager ─────────────────────────────────────────────────────

export class HermesSessionManager {
  private activePids: Map<string, ChildProcess> = new Map();

  /**
   * Resolve path to the native Hermes executable cross-platform (Linux/Windows/Docker).
   */
  private getExePath(): string {
    const envPath = process.env.HERMES_EXE_PATH || process.env.HERMES_PATH;
    if (envPath && fs.existsSync(envPath)) return envPath;

    // Linux / Render container binary locations
    if (process.platform !== "win32") {
      const linuxPaths = [
        "/usr/local/bin/hermes",
        "/usr/bin/hermes",
        path.join(process.env.HOME || "/root", ".hermes", "bin", "hermes"),
        path.join(process.env.HOME || "/root", ".local", "bin", "hermes"),
      ];
      for (const p of linuxPaths) {
        if (fs.existsSync(p)) return p;
      }
      return "hermes";
    }

    // Windows standard location via LOCALAPPDATA
    if (process.env.LOCALAPPDATA) {
      const winPath = path.join(process.env.LOCALAPPDATA, "hermes", "hermes-agent", "bin", "hermes.exe");
      if (fs.existsSync(winPath)) return winPath;
    }

    return "hermes";
  }

  /**
   * Get the Hermes workspace directory (where AGENTS.md lives).
   */
  private getWorkspaceDir(): string {
    const dir = path.join(process.cwd(), "hermes-workspace");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Derive a stable Hermes session name for a conversation.
   */
  private sessionName(conversationId: string): string {
    return `agenttrust-${conversationId.substring(0, 12)}`;
  }

  /**
   * Build the full message to send to Hermes, including minimal context metadata.
   */
  private buildMessage(msg: HermesMessage): string {
    let text = msg.userMessage;

    // Prepend workspace context as a compact system-level note
    const contextLines: string[] = [
      `[workspaceId: "${msg.workspaceId}"]`,
      `[conversationId: "${msg.conversationId}"]`,
    ];

    if (msg.activeEntity) {
      contextLines.push(
        `[activeEntity: ${msg.activeEntity.type}, ${msg.activeEntity.type}Id: "${msg.activeEntity.id}"]`,
      );
    }
    if (msg.currentPage) {
      contextLines.push(`[currentPage: "${msg.currentPage}"]`);
    }

    // The context is prepended as metadata, then a blank line, then the user message
    return contextLines.join("\n") + "\n\n" + text;
  }

  /**
   * Send a message to the native Hermes Agent using named session persistence.
   *
   * Uses: hermes chat -c <session> --create-if-missing -q "<message>" --quiet
   *
   * This invokes Hermes with:
   * - Named session (-c) that persists conversation in Hermes's native storage
   * - --create-if-missing so the first message creates the session
   * - --quiet for programmatic output (no banner/spinner)
   * - --source tool to tag this as a programmatic integration
   * - --yolo to bypass approval prompts
   * - --accept-hooks for headless operation
   * - --max-turns 50 as a safety limit per message
   * - CWD set to hermes-workspace/ where AGENTS.md lives
   */
  public async sendMessage(msg: HermesMessage): Promise<HermesResponse> {
    const exePath = this.getExePath();
    const workspaceDir = this.getWorkspaceDir();
    const session = this.sessionName(msg.conversationId);
    const fullMessage = this.buildMessage(msg);
    const taskId = `hermes_${msg.conversationId}_${Date.now()}`;
    const timeoutMs = Number(process.env.HERMES_TIMEOUT_MS) || 300000; // 5 minutes default
    const startTime = Date.now();

    // Assertion: user message must be real
    if (!msg.userMessage.trim()) {
      throw new Error("HERMES_SESSION_ERROR: Empty user message.");
    }

    logInfo(`[HermesSession] Session: ${session}`);
    logInfo(`[HermesSession] UserMessage: "${msg.userMessage}"`);
    logInfo(`[HermesSession] WorkspaceId: ${msg.workspaceId}`);
    if (msg.activeEntity) {
      logInfo(
        `[HermesSession] ActiveEntity: ${msg.activeEntity.type} ${msg.activeEntity.id}`,
      );
    }

    // Emit SSE: starting
    workflowEvents.emitProgress({
      workflowId: taskId,
      stage: "NOVA_STARTED",
      stepName: "Sending message to NOVA agent...",
      completedSteps: 1,
      totalSteps: 5,
      timestamp: new Date().toISOString(),
    });

    return new Promise<HermesResponse>((resolve, reject) => {
      let stdoutBuffer = "";
      let stderrBuffer = "";
      let isCompleted = false;

      const args = [
        "chat",
        "-c",
        session,
        "--create-if-missing",
        "-q",
        fullMessage,
        "--quiet",
        "--source",
        "tool",
        "--yolo",
        "--accept-hooks",
        "--max-turns",
        "50",
      ];

      const child = spawn(exePath, args, {
        cwd: workspaceDir,
        env: { ...process.env },
        windowsHide: true,
      });

      logInfo(`[HermesSession] Spawned: PID ${child.pid}, session=${session}`);
      this.activePids.set(taskId, child);

      // Timeout safety
      const timer = setTimeout(() => {
        if (!isCompleted) {
          logWarn(
            `[HermesSession] Timeout after ${timeoutMs}ms. Killing PID ${child.pid}.`,
          );
          child.kill("SIGKILL");
          this.activePids.delete(taskId);
          reject(new Error(`Hermes session timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      // Capture stdout
      child.stdout.on("data", (chunk: Buffer) => {
        const text = chunk.toString("utf8");
        stdoutBuffer += text;

        // Stream observable activity lines via SSE
        const lines = text.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Detect tool usage and activity from Hermes output
          let stage = "NOVA_THINKING";
          let stepName = trimmed.substring(0, 150);

          const lower = trimmed.toLowerCase();
          if (lower.includes("get_products") || lower.includes("get_product")) {
            stage = "NOVA_TOOL_CALL";
            stepName = "Checking product catalog...";
          } else if (
            lower.includes("get_opportunities") ||
            lower.includes("get_opportunity")
          ) {
            stage = "NOVA_TOOL_CALL";
            stepName = "Reviewing opportunities...";
          } else if (
            lower.includes("get_leads") ||
            lower.includes("get_deals")
          ) {
            stage = "NOVA_TOOL_CALL";
            stepName = "Checking leads and deals...";
          } else if (lower.includes("get_business_context")) {
            stage = "NOVA_TOOL_CALL";
            stepName = "Loading business context...";
          } else if (lower.includes("get_sales_metrics")) {
            stage = "NOVA_TOOL_CALL";
            stepName = "Analyzing sales metrics...";
          } else if (lower.includes("create_opportunity")) {
            stage = "NOVA_WRITING";
            stepName = "Saving new opportunity...";
          } else if (lower.includes("create_lead")) {
            stage = "NOVA_WRITING";
            stepName = "Creating new lead...";
          } else if (
            lower.includes("search") ||
            lower.includes("web") ||
            lower.includes("tavily") ||
            lower.includes("http")
          ) {
            stage = "NOVA_RESEARCHING";
            stepName = "Researching the web...";
          } else if (
            lower.includes("read") ||
            lower.includes("page") ||
            lower.includes("browsing")
          ) {
            stage = "NOVA_BROWSING";
            stepName = "Reading web content...";
          }

          workflowEvents.emitProgress({
            workflowId: taskId,
            stage,
            stepName,
            completedSteps: 3,
            totalSteps: 5,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Capture stderr (Hermes logs, tool output, etc.)
      child.stderr.on("data", (chunk: Buffer) => {
        stderrBuffer += chunk.toString("utf8");
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        isCompleted = true;
        this.activePids.delete(taskId);
        logError(`[HermesSession] Process error:`, err);
        reject(err);
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        isCompleted = true;
        this.activePids.delete(taskId);
        const durationMs = Date.now() - startTime;

        logInfo(
          `[HermesSession] Exited: code=${code}, duration=${durationMs}ms`,
        );

        if (code !== 0 && !stdoutBuffer.trim()) {
          logError(
            `[HermesSession] Non-zero exit with no output. stderr: ${stderrBuffer.substring(0, 500)}`,
          );

          workflowEvents.emitProgress({
            workflowId: taskId,
            stage: "NOVA_FAILED",
            stepName: "Agent process failed",
            completedSteps: 0,
            totalSteps: 5,
            details: { error: stderrBuffer.substring(0, 300) },
            timestamp: new Date().toISOString(),
          });

          reject(
            new Error(
              `Hermes exited with code ${code}: ${stderrBuffer.substring(0, 300)}`,
            ),
          );
          return;
        }

        // The --quiet mode outputs only the final response text
        const responseText = stdoutBuffer.trim();

        logInfo(
          `[HermesSession] Response length: ${responseText.length} chars`,
        );

        workflowEvents.emitProgress({
          workflowId: taskId,
          stage: "NOVA_COMPLETED",
          stepName: "NOVA response ready",
          completedSteps: 5,
          totalSteps: 5,
          timestamp: new Date().toISOString(),
        });

        resolve({
          text: responseText,
          sessionName: session,
          durationMs,
        });
      });
    });
  }

  /**
   * Cancel a running Hermes process by task ID.
   */
  public cancel(taskId: string): boolean {
    const proc = this.activePids.get(taskId);
    if (proc) {
      logInfo(`[HermesSession] Cancelling task ${taskId}`);
      proc.kill("SIGTERM");
      this.activePids.delete(taskId);
      return true;
    }
    return false;
  }

  /**
   * Kill all active Hermes processes (shutdown).
   */
  public killAll(): void {
    for (const [id, proc] of this.activePids) {
      logInfo(`[HermesSession] Killing ${id}`);
      proc.kill("SIGTERM");
    }
    this.activePids.clear();
  }

  /**
   * Health check: verify hermes.exe is accessible.
   */
  public async healthCheck(): Promise<{
    ok: boolean;
    version?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const exePath = this.getExePath();
      const child = spawn(exePath, ["version"], { windowsHide: true });
      let out = "";

      child.stdout.on("data", (d: Buffer) => {
        out += d.toString();
      });
      child.stderr.on("data", (d: Buffer) => {
        out += d.toString();
      });

      child.on("error", (err) => resolve({ ok: false, error: err.message }));
      child.on("close", (code) => {
        if (code === 0) {
          resolve({ ok: true, version: out.trim().split("\n")[0] });
        } else {
          resolve({
            ok: false,
            error: `Exit code ${code}: ${out.substring(0, 200)}`,
          });
        }
      });

      setTimeout(() => {
        child.kill();
        resolve({ ok: false, error: "Health check timed out" });
      }, 10000);
    });
  }
}

export const hermesSessionManager = new HermesSessionManager();
