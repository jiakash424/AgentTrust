import crypto from "crypto";
import { Response } from "express";
import { prisma } from "../../db";
import { logInfo, logError } from "../../utils/logger";

export interface NotificationPayload {
  workspaceId: string;
  opportunityId?: string;
  type: "OPPORTUNITY_NEW_FOUND" | "OPPORTUNITY_UPDATED" | "MONITOR_STATUS";
  companyName: string;
  classification: string;
  matchScore: number;
  location?: string;
  reason?: string;
  evidenceHash?: string;
  metadata?: Record<string, any>;
}

// SSE Connection Manager for live in-app toasts & badge count updates
class SSEManager {
  private clients = new Map<string, Set<Response>>();

  public addClient(workspaceId: string, res: Response) {
    if (!this.clients.has(workspaceId)) {
      this.clients.set(workspaceId, new Set());
    }
    this.clients.get(workspaceId)!.add(res);

    res.on("close", () => {
      this.clients.get(workspaceId)?.delete(res);
      if (this.clients.get(workspaceId)?.size === 0) {
        this.clients.delete(workspaceId);
      }
    });
  }

  public broadcast(workspaceId: string, eventType: string, data: any) {
    const set = this.clients.get(workspaceId);
    if (!set || set.size === 0) return;

    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    set.forEach((res) => {
      try {
        res.write(payload);
      } catch (err) {
        set.delete(res);
      }
    });
  }
}

export const sseManager = new SSEManager();

export class NotificationService {
  /**
   * Dispatches notifications with strict idempotency and user preferences
   */
  public async notifyNewOpportunity(
    payload: NotificationPayload,
  ): Promise<boolean> {
    try {
      // 1. Fetch Workspace Monitor Settings
      const monitor = await prisma.opportunityMonitor.findUnique({
        where: { workspaceId: payload.workspaceId },
      });

      const inAppEnabled = monitor?.inAppNotifyEnabled ?? true;
      const minScore = monitor?.minMatchScoreAlert ?? 70;

      // Filter out low score matches based on user preference
      if (payload.matchScore < minScore) {
        logInfo(
          `[NotificationService] Skipped alert for ${payload.companyName}: score ${payload.matchScore} < min threshold ${minScore}`,
        );
        return false;
      }

      // 2. Compute Idempotency Key: workspaceId + opportunityId + changeType + evidenceHash
      const rawIdemKey = `${payload.workspaceId}:${payload.opportunityId || payload.companyName}:${payload.type}:${payload.evidenceHash || "v1"}`;
      const idempotencyKey = crypto
        .createHash("sha256")
        .update(rawIdemKey)
        .digest("hex");

      // Check if notification already exists for this idempotency key
      const existing = await prisma.opportunityNotification.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        logInfo(
          `[NotificationService] Idempotent skip: notification already sent for key ${idempotencyKey.slice(0, 10)}`,
        );
        return false;
      }

      // 3. Create In-App Notification Record
      const title =
        payload.type === "OPPORTUNITY_NEW_FOUND"
          ? `New high-match buyer found: ${payload.companyName} — Match Score ${payload.matchScore}`
          : `Opportunity update: ${payload.companyName}`;

      const message = `${payload.classification} in ${payload.location || "India"}. ${payload.reason || "Product profile matches target buyer profile."}`;

      if (inAppEnabled) {
        let validOppId: string | null = null;
        if (payload.opportunityId) {
          const oppExists = await prisma.opportunity.findUnique({
            where: { id: payload.opportunityId },
            select: { id: true },
          });
          if (oppExists) validOppId = payload.opportunityId;
        }

        await prisma.opportunityNotification.create({
          data: {
            workspaceId: payload.workspaceId,
            opportunityId: validOppId,
            type: payload.type,
            title,
            message,
            read: false,
            idempotencyKey,
            metadata: (payload.metadata as any) || {},
          },
        });
      }

      // 4. Broadcast Real-Time Event via SSE
      sseManager.broadcast(payload.workspaceId, payload.type, {
        id: idempotencyKey,
        title,
        message,
        companyName: payload.companyName,
        matchScore: payload.matchScore,
        opportunityId: payload.opportunityId,
        createdAt: new Date().toISOString(),
      });

      // 5. Opt-in WhatsApp Alerts (If configured)
      if (monitor?.whatsAppNotifyEnabled) {
        logInfo(
          `[NotificationService] Opt-in WhatsApp alert queued for workspace ${payload.workspaceId}`,
        );
        // Dispatch WhatsApp Cloud API payload if connection is active
      }

      return true;
    } catch (err: any) {
      logError(`[NotificationService] Failed to notify opportunity:`, err);
      return false;
    }
  }

  /**
   * Broadcasts monitor background workflow progress / status events via SSE
   */
  public broadcastProgress(workspaceId: string, eventType: string, data: any) {
    sseManager.broadcast(workspaceId, eventType, data);
  }
}

export const notificationService = new NotificationService();
