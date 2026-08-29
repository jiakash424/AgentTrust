import { prisma } from "../../db";
import { opportunityMonitoringService } from "./opportunity-monitoring.service";
import { logInfo, logError } from "../../utils/logger";

export class OpportunityMonitoringScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isTicking = false;

  /**
   * Starts the background scheduler tick loop
   */
  public start(intervalMs: number = 60000) {
    if (this.timer) {
      logInfo("[OpportunityMonitoringScheduler] Ticker already running.");
      return;
    }

    logInfo(
      `[OpportunityMonitoringScheduler] Starting autonomous scheduler ticker (interval: ${intervalMs}ms)...`,
    );

    // Run initial tick after 5 seconds to allow server bootstrap
    setTimeout(() => this.tick(), 5000);

    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  /**
   * Stops the background scheduler
   */
  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logInfo("[OpportunityMonitoringScheduler] Stopped scheduler ticker.");
    }
  }

  /**
   * Ticks and checks all monitors due for background execution
   */
  private async tick() {
    if (this.isTicking) return;
    this.isTicking = true;

    try {
      const now = new Date();

      // Find monitors that are enabled, not currently running, and due for a run
      const dueMonitors = await prisma.opportunityMonitor.findMany({
        where: {
          enabled: true,
          status: { not: "RUNNING" },
          OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
        },
      });

      if (dueMonitors.length > 0) {
        logInfo(
          `[OpportunityMonitoringScheduler] Found ${dueMonitors.length} monitors due for execution.`,
        );
      }

      for (const monitor of dueMonitors) {
        try {
          await opportunityMonitoringService.executeMonitoringRun(
            monitor.workspaceId,
            monitor.id,
          );
        } catch (err: any) {
          logError(
            `[OpportunityMonitoringScheduler] Error running monitor for workspace ${monitor.workspaceId}:`,
            err,
          );
        }
      }
    } catch (err: any) {
      logError("[OpportunityMonitoringScheduler] Tick error:", err);
    } finally {
      this.isTicking = false;
    }
  }
}

export const opportunityMonitoringScheduler =
  new OpportunityMonitoringScheduler();
