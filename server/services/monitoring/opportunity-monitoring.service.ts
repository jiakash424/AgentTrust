import { prisma } from "../../db";
import { activeBusinessContextService } from "../active-business-context.service";
import { hermesBuyerResearchAgentService } from "../hermes-buyer-research-agent.service";
import { opportunityDeduplicationService } from "./opportunity-deduplication.service";
import { opportunityChangeDetectionService } from "./opportunity-change-detection.service";
import { notificationService } from "./notification.service";
import { logInfo, logWarn, logError } from "../../utils/logger";

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    attempt++;
    try {
      return await fn();
    } catch (err: any) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw new Error("DB retry timeout");
}

export interface MonitorExecutionResult {
  runId: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED" | "SKIPPED_ALREADY_RUNNING";
  opportunitiesFound: number;
  newOpportunitiesFound: number;
  updatedOpportunitiesFound: number;
  duplicateOpportunitiesIgnored: number;
  summary: string;
  error?: string;
}

export class OpportunityMonitoringService {
  /**
   * Executes a single background autonomous monitoring run for a workspace
   */
  public async executeMonitoringRun(
    workspaceId: string,
    monitorId?: string,
  ): Promise<MonitorExecutionResult> {
    logInfo(
      `[OpportunityMonitoringService] Initiating background monitoring run for workspace ${workspaceId}...`,
    );

    // 1. Database-backed Lock Check: Prevent overlapping runs for the same workspace
    const monitor = await withDbRetry(() =>
      prisma.opportunityMonitor.findUnique({
        where: { workspaceId },
      }),
    );

    if (monitor && monitor.status === "RUNNING") {
      logWarn(
        `[OpportunityMonitoringService] Skipped: Monitor for workspace ${workspaceId} is already running.`,
      );
      return {
        runId: `skipped_${Date.now()}`,
        status: "SKIPPED_ALREADY_RUNNING",
        opportunitiesFound: 0,
        newOpportunitiesFound: 0,
        updatedOpportunitiesFound: 0,
        duplicateOpportunitiesIgnored: 0,
        summary:
          "Execution skipped because a monitoring run is already in progress.",
      };
    }

    // Lock monitor status to RUNNING
    const activeMonitor = await withDbRetry(() =>
      prisma.opportunityMonitor.upsert({
        where: { workspaceId },
        update: { status: "RUNNING", lastRunAt: new Date() },
        create: {
          workspaceId,
          enabled: true,
          frequencyMinutes: 60,
          status: "RUNNING",
          lastRunAt: new Date(),
        },
      }),
    );

    // Create telemetry record for this run
    const researchRun = await withDbRetry(() =>
      prisma.opportunityResearchRun.create({
        data: {
          workspaceId,
          monitorId: activeMonitor.id,
          status: "RUNNING",
          startedAt: new Date(),
        },
      }),
    );

    notificationService.broadcastProgress(
      workspaceId,
      "OPPORTUNITY_MONITOR_STARTED",
      {
        runId: researchRun.id,
        timestamp: new Date().toISOString(),
        stepName: "Autonomous Opportunity Monitor Started",
      },
    );

    let newCount = 0;
    let updatedCount = 0;
    let ignoredCount = 0;
    let totalFound = 0;
    let runSummary = "";

    try {
      // STEP 1: Load Active Business Context & Known Opportunities History
      const activeCtx =
        await activeBusinessContextService.resolveContext(workspaceId);
      const existingOpps = await withDbRetry(() =>
        prisma.opportunity.findMany({
          where: { workspaceId },
          select: {
            id: true,
            companyName: true,
            website: true,
            publicEmail: true,
            phone: true,
            city: true,
            country: true,
            opportunityScore: true,
            evidenceHash: true,
            sourceFingerprint: true,
            buyingSignals: true,
            buyerBuyingPrice: true,
          },
        }),
      );

      // Map known company fingerprints
      const knownFingerprints = new Set(
        existingOpps.map((o) => o.sourceFingerprint).filter(Boolean),
      );

      // STEP 2 & 3: Autonomous Hermes Research with Context & Known Identifiers
      const city =
        activeCtx.primaryLocation?.city ||
        activeCtx.primaryLocation?.label ||
        "India";
      const targetProduct = activeCtx.products[0] || "Wholesale Goods";
      const prompt = `Autonomous Monitor Task: Discover genuinely new active B2B buyers, merchants, distributors, or commercial procurement partners for ${targetProduct} in ${city}. Exclude companies already discovered: [${existingOpps
        .slice(0, 10)
        .map((o) => o.companyName)
        .join(", ")}]`;

      notificationService.broadcastProgress(
        workspaceId,
        "OPPORTUNITY_MONITOR_PROGRESS",
        {
          runId: researchRun.id,
          stepName: `Hermes researching new buyers for ${targetProduct} in ${city}`,
        },
      );

      const hermesRes = await hermesBuyerResearchAgentService.researchBuyers(
        workspaceId,
        prompt,
        `wf_mon_${researchRun.id}`,
      );

      // Hermes saves opportunities directly via create_opportunity MCP tool during research
      const candidateOpps: any[] = [];
      totalFound = candidateOpps.length;

      // STEP 4 & 5: Deterministic Deduplication & Change Detection
      for (const candidate of candidateOpps) {
        if ((candidate.classification as string) === "COMPETITOR") {
          ignoredCount++;
          continue;
        }

        const normalizedId = opportunityDeduplicationService.normalizeCandidate(
          {
            companyName: candidate.companyName,
            website: candidate.website || undefined,
            publicEmail: candidate.publicEmail || undefined,
            phone: candidate.publicPhone || undefined,
            city: candidate.location || city,
            country: "India",
            verifiedFacts: candidate.verifiedFacts,
            aiInferences: candidate.verifiedFacts,
            productFitReason: candidate.whyRelevant,
            sources: (candidate.sourceUrls || []).map((url: string) => ({
              sourceName: "Native Hermes",
              sourceUrl: url,
            })),
          },
        );

        // Find existing match in database
        const existingMatch = existingOpps.find((e) =>
          opportunityDeduplicationService.isSameCompany(normalizedId, {
            companyName: e.companyName || "",
            normalizedName: e.companyName || "",
            domain: e.website
              ? e.website.replace(/https?:\/\//, "").split("/")[0]
              : undefined,
            cleanPhone: e.phone || undefined,
            cleanEmail: e.publicEmail || undefined,
            city: e.city || undefined,
            country: e.country || undefined,
            sourceFingerprint: e.sourceFingerprint || "",
            evidenceHash: e.evidenceHash || "",
            contentHash: "",
          }),
        );

        const changeResult = opportunityChangeDetectionService.detectChanges(
          {
            ...normalizedId,
            matchScore: candidate.confidence || 85,
            phone: candidate.publicPhone || undefined,
            publicEmail: candidate.publicEmail || undefined,
            buyingIntentEvidence: candidate.verifiedFacts,
          },
          existingMatch,
        );

        if (changeResult.changeType === "NEW") {
          // Save NEW opportunity to PostgreSQL
          const createdOpp = await withDbRetry(() =>
            prisma.opportunity.create({
              data: {
                workspaceId,
                companyName: candidate.companyName,
                legalName: candidate.companyName,
                title: candidate.companyName,
                description:
                  candidate.whyRelevant || "Discovered by Autonomous Monitor",
                category: candidate.classification || "POTENTIAL_BUYER",
                industry: activeCtx.industry || "Commerce",
                businessType: candidate.classification || "POTENTIAL_BUYER",
                opportunityType: candidate.classification || "POTENTIAL_BUYER",
                type: candidate.classification || "POTENTIAL_BUYER",
                status: "QUALIFIED",
                qualificationStatus: "QUALIFIED",
                verificationStatus: candidate.publicPhone
                  ? "VERIFIED"
                  : "PARTIALLY_VERIFIED",
                opportunityScore: candidate.confidence || 85,
                confidence: candidate.confidence || 85,
                country: "India",
                stateRegion: "Uttar Pradesh",
                city: candidate.location || city,
                website: candidate.website || null,
                publicEmail: candidate.publicEmail || null,
                phone: candidate.publicPhone || null,
                productName: targetProduct,
                matchedProductNames: [targetProduct],
                matchReason: candidate.whyRelevant,
                reason: candidate.whyRelevant,
                evidenceHash: normalizedId.evidenceHash,
                contentHash: normalizedId.contentHash,
                sourceFingerprint: normalizedId.sourceFingerprint,
                verifiedFacts: candidate.verifiedFacts as any,
                aiInsights: candidate.verifiedFacts as any,

                buyerBuyingPrice: 2800,
                buyerPriceUnit: "Quintal",
                potentialImpact: 1400000,
                potentialGrossProfit: 175000,

                sources: {
                  create: (candidate.sourceUrls || []).map((url: string) => ({
                    sourceType: "WEB",
                    sourceUrl: url,
                    sourceName: "Native Hermes Autonomous Monitor",
                    verificationStatus: "VERIFIED",
                  })),
                },
              },
            }),
          );

          await withDbRetry(() =>
            prisma.deal.create({
              data: {
                workspaceId,
                opportunityId: createdOpp.id,
                title: `Deal - ${createdOpp.companyName || "B2B Buyer"}`,
                companyName: createdOpp.companyName || "B2B Buyer",
                stage: "QUALIFIED",
                productName: targetProduct,
                matchScore: createdOpp.opportunityScore,
                estimatedQuantity: 100,
                estimatedValue: (candidate.confidence || 85) * 150,
              },
            }),
          ).catch(() => {});

          newCount++;

          // Dispatch Notification
          await notificationService.notifyNewOpportunity({
            workspaceId,
            opportunityId: createdOpp.id,
            type: "OPPORTUNITY_NEW_FOUND",
            companyName: candidate.companyName,
            classification: candidate.classification,
            matchScore: candidate.confidence || 85,
            location: `${candidate.location || city}, India`,
            reason: candidate.whyRelevant,
            evidenceHash: normalizedId.evidenceHash,
          });
        } else if (
          changeResult.changeType === "EXISTING_UPDATED" &&
          changeResult.existingOpportunityId
        ) {
          // Update existing opportunity with new facts
          await withDbRetry(() =>
            prisma.opportunity.update({
              where: { id: changeResult.existingOpportunityId },
              data: {
                lastSeenAt: new Date(),
                lastVerifiedAt: new Date(),
                evidenceHash: normalizedId.evidenceHash,
                phone: candidate.publicPhone || undefined,
                publicEmail: candidate.publicEmail || undefined,
                opportunityScore: candidate.confidence || 85,
              },
            }),
          );

          updatedCount++;

          await notificationService.notifyNewOpportunity({
            workspaceId,
            opportunityId: changeResult.existingOpportunityId,
            type: "OPPORTUNITY_UPDATED",
            companyName: candidate.companyName,
            classification: candidate.classification,
            matchScore: candidate.confidence || 85,
            location: `${candidate.location || city}, India`,
            reason: changeResult.changeReasons.join(", "),
            evidenceHash: normalizedId.evidenceHash,
          });
        } else {
          ignoredCount++;
          if (existingMatch) {
            await withDbRetry(() =>
              prisma.opportunity.update({
                where: { id: existingMatch.id },
                data: { lastSeenAt: new Date() },
              }),
            ).catch(() => {});
          }
        }
      }

      runSummary = `Autonomous run completed. Discovered ${totalFound} candidates (${newCount} new, ${updatedCount} updated, ${ignoredCount} duplicates ignored).`;

      // Update Research Run Record
      await withDbRetry(() =>
        prisma.opportunityResearchRun.update({
          where: { id: researchRun.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            opportunitiesFound: totalFound,
            newOpportunitiesFound: newCount,
            updatedOpportunitiesFound: updatedCount,
            duplicateOpportunitiesIgnored: ignoredCount,
            summary: runSummary,
          },
        }),
      );

      // Calculate Next Run Schedule
      const nextRunAt = new Date(
        Date.now() + activeMonitor.frequencyMinutes * 60 * 1000,
      );

      // Unlock Monitor Status
      await withDbRetry(() =>
        prisma.opportunityMonitor.update({
          where: { id: activeMonitor.id },
          data: {
            status: "IDLE",
            lastSuccessfulRunAt: new Date(),
            nextRunAt,
            runsTodayCount: { increment: 1 },
            lastError: null,
          },
        }),
      );

      notificationService.broadcastProgress(
        workspaceId,
        "OPPORTUNITY_MONITOR_COMPLETED",
        {
          runId: researchRun.id,
          newCount,
          updatedCount,
          ignoredCount,
          nextRunAt: nextRunAt.toISOString(),
        },
      );

      return {
        runId: researchRun.id,
        status: "COMPLETED",
        opportunitiesFound: totalFound,
        newOpportunitiesFound: newCount,
        updatedOpportunitiesFound: updatedCount,
        duplicateOpportunitiesIgnored: ignoredCount,
        summary: runSummary,
      };
    } catch (err: any) {
      logError(
        `[OpportunityMonitoringService] Execution failed for workspace ${workspaceId}:`,
        err,
      );

      await prisma.opportunityResearchRun
        .update({
          where: { id: researchRun.id },
          data: {
            status: "FAILED",
            completedAt: new Date(),
            error: err.message,
          },
        })
        .catch(() => {});

      await prisma.opportunityMonitor
        .update({
          where: { id: activeMonitor.id },
          data: {
            status: "ERROR",
            lastError: err.message,
          },
        })
        .catch(() => {});

      notificationService.broadcastProgress(
        workspaceId,
        "OPPORTUNITY_MONITOR_FAILED",
        {
          runId: researchRun.id,
          error: err.message,
        },
      );

      return {
        runId: researchRun.id,
        status: "FAILED",
        opportunitiesFound: totalFound,
        newOpportunitiesFound: newCount,
        updatedOpportunitiesFound: updatedCount,
        duplicateOpportunitiesIgnored: ignoredCount,
        summary: "Monitoring run failed.",
        error: err.message,
      };
    }
  }
}

export const opportunityMonitoringService = new OpportunityMonitoringService();
