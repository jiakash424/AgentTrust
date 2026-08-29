import { prisma } from "../db";
import { agentTaskManagerService } from "./agent-task-manager.service";
import { opportunityDeduplicationService } from "./monitoring/opportunity-deduplication.service";
import { notificationService } from "./monitoring/notification.service";
import { logInfo, logWarn, logError } from "../utils/logger";
import { workflowEvents } from "../events/workflow-events";

export interface CatalogDiscoveryOptions {
  productId?: string;
  force?: boolean;
  reason?: string;
}

export class AutonomousCatalogDiscoveryService {
  private lastRunTimestamps = new Map<string, number>();
  private readonly COOLDOWN_MS = 15 * 60 * 1000; // 15-minute cooldown window

  /**
   * Triggers an autonomous Hermes background opportunity discovery run
   * based on active product catalog data.
   */
  public async triggerCatalogDiscovery(
    workspaceId: string,
    options?: CatalogDiscoveryOptions,
  ): Promise<{ taskId?: string; status: string; message: string }> {
    logInfo(
      `[AutonomousCatalogDiscovery] Evaluating discovery trigger for workspace '${workspaceId}' (Reason: ${options?.reason || "TRIGGERED"})...`,
    );

    // 1. Check Active Product Catalog
    const activeProducts = await prisma.product.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
    });

    if (activeProducts.length === 0) {
      logInfo(
        `[AutonomousCatalogDiscovery] Workspace '${workspaceId}' has 0 active products. Skipping buyer discovery.`,
      );
      return {
        status: "SKIPPED_NO_PRODUCTS",
        message:
          "No active products found in catalog. Add products to enable autonomous discovery.",
      };
    }

    // 2. Cooldown & Lock Check
    const now = Date.now();
    const lastRun = this.lastRunTimestamps.get(workspaceId) || 0;
    const timeSinceLastRun = now - lastRun;

    if (!options?.force && timeSinceLastRun < this.COOLDOWN_MS) {
      const remainingMins = Math.ceil(
        (this.COOLDOWN_MS - timeSinceLastRun) / 60000,
      );
      logInfo(
        `[AutonomousCatalogDiscovery] Discovery for workspace '${workspaceId}' skipped due to cooldown (${remainingMins} min remaining).`,
      );
      return {
        status: "SKIPPED_COOLDOWN",
        message: `A recent discovery task completed within the last 15 minutes. Next run in ~${remainingMins} mins.`,
      };
    }

    // Update timestamp lock
    this.lastRunTimestamps.set(workspaceId, now);

    // 3. Formulate Context-Rich Command for Hermes Autonomous Agent
    const targetProduct = options?.productId
      ? activeProducts.find((p) => p.id === options.productId)
      : activeProducts[0];

    const catalogSummary = activeProducts
      .slice(0, 5)
      .map(
        (p) =>
          `${p.name} (${p.units || 500} ${p.unit || "Quintal"} available at ₹${p.targetSellingPrice || p.basePrice || "Market"}/${p.unit || "unit"})`,
      )
      .join("; ");

    const commandPrompt =
      options?.productId && targetProduct
        ? `Discover active B2B buyers, commercial procurement managers, and bulk distributors for product: "${targetProduct.name}". Catalog context: [${catalogSummary}]. Find real business leads, verify facts, calculate match scores, and save qualified opportunities.`
        : `Autonomous Catalog Discovery: Find qualified B2B buyers and commercial distribution partners for active workspace products: [${catalogSummary}]. Research, verify, deduplicate, and persist new qualified opportunities.`;

    logInfo(
      `[AutonomousCatalogDiscovery] Launching background Hermes task for workspace '${workspaceId}' with prompt: "${commandPrompt}"`,
    );

    // 4. Launch Background Hermes Task via AgentTaskManager
    const task = await agentTaskManagerService.createTask(
      workspaceId,
      commandPrompt,
      {
        targetEntityId: options?.productId,
      },
    );

    // Notify UI that auto-discovery task has launched
    workflowEvents.emitProgress({
      workflowId: task.taskId,
      type: "THINKING",
      stage: "thinking",
      stepName: "Autonomous catalog discovery initiated for active products",
      completedSteps: 1,
      totalSteps: 10,
      timestamp: new Date().toISOString(),
    });

    return {
      taskId: task.taskId,
      status: "LAUNCHED",
      message: `Autonomous Hermes opportunity discovery task '${task.taskId}' launched in background.`,
    };
  }

  /**
   * Ensures initial auto-discovery runs seamlessly on startup / page load
   * without requiring user input if products exist but opportunities are empty.
   */
  public async ensureInitialDiscovery(workspaceId: string): Promise<void> {
    try {
      const activeProductsCount = await prisma.product.count({
        where: { workspaceId },
      });
      if (activeProductsCount === 0) return;

      const oppCount = await prisma.opportunity.count({
        where: { workspaceId },
      });
      const lastRun = await prisma.opportunityResearchRun.findFirst({
        where: { workspaceId },
        orderBy: { startedAt: "desc" },
      });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Trigger if 0 opportunities exist OR last run was > 1 hour ago
      if (oppCount === 0 || !lastRun || lastRun.startedAt < oneHourAgo) {
        logInfo(
          `[AutonomousCatalogDiscovery] Initial auto-discovery triggered for workspace '${workspaceId}' (opps: ${oppCount}).`,
        );
        this.triggerCatalogDiscovery(workspaceId, {
          reason: "INITIAL_CATALOG_AUTO_DISCOVERY",
        }).catch(console.error);
      }
    } catch (err) {
      logError(
        "[AutonomousCatalogDiscovery] Error checking initial discovery status:",
        err,
      );
    }
  }
}

export const autonomousCatalogDiscoveryService =
  new AutonomousCatalogDiscoveryService();
