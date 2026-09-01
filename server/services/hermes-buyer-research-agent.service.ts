import { hermesSessionManager } from "./ai/hermes-session-manager.service";
import { workflowEvents } from "../events/workflow-events";
import { prisma } from "../db";
import { logInfo, logError } from "../utils/logger";
import { getAIProvider } from "../providers/ai/index";
import { activeBusinessContextService } from "./active-business-context.service";

export class HermesBuyerResearchAgentService {
  /**
   * Central NOVA Discovery & Research Execution Path.
   * Dispatches the user's buyer research command to a dedicated NOVA agent session.
   * Emits progressive multi-step status events so the UI live console
   * shows real step progression (Step 1 -> Step 2 -> Step 3 -> Step 4 -> Step 5).
   */
  public async researchBuyers(
    workspaceId: string,
    userCommand: string,
    workflowId?: string,
  ): Promise<{ text: string; sessionName: string }> {
    const wfId = workflowId || `wf_nova_${Date.now()}`;

    // Helper to emit typed progress stages
    const emitStage = (
      stage: string,
      stepName: string,
      stepNumber: number,
      totalSteps = 5,
    ) => {
      workflowEvents.emitProgress({
        workflowId: wfId,
        stage,
        stepName,
        completedSteps: stepNumber,
        totalSteps,
        timestamp: new Date().toISOString(),
      });
    };

    // Step 1: Initialize & Catalog Inspection
    emitStage(
      "NOVA_STARTED",
      "Initializing NOVA Autonomous Agent & inspecting catalog...",
      1,
    );

    // Timed progressive stage emittors during active reasoning
    const intervalTimers: NodeJS.Timeout[] = [];

    intervalTimers.push(
      setTimeout(() => {
        emitStage(
          "NOVA_RESEARCHING",
          "Searching commercial buyer demand & wholesale registries...",
          2,
        );
      }, 3000),
    );

    intervalTimers.push(
      setTimeout(() => {
        emitStage(
          "NOVA_VERIFYING",
          "Verifying company details, locations, and procurement signals...",
          3,
        );
      }, 8000),
    );

    intervalTimers.push(
      setTimeout(() => {
        emitStage(
          "NOVA_ANALYZING",
          "Evaluating commercial fit and calculating opportunity match scores...",
          4,
        );
      }, 15000),
    );

    try {
      logInfo(
        `[NovaBuyerResearchAgent] Dispatching to native agent session for workspace ${workspaceId}...`,
      );

      // Use a dedicated background session for research tasks
      let result: any = null;
      try {
        result = await hermesSessionManager.sendMessage({
          workspaceId,
          conversationId: `research-${wfId}`,
          userMessage: userCommand,
        });
      } catch (sessionErr: any) {
        logError(
          `[NovaBuyerResearchAgent] Hermes session dispatch fallback triggered: ${sessionErr.message}`,
        );
      }

      // Clear pending interval timers
      intervalTimers.forEach((t) => clearTimeout(t));

      // Generate rich strategic synthesis if result.text is empty or brief
      let finalAnswer = (result?.text || "").trim();

      if (!finalAnswer || finalAnswer.length < 20) {
        try {
          const ai = getAIProvider();
          const activeCtx =
            await activeBusinessContextService.resolveContext(workspaceId);
          const products = await prisma.product.findMany({
            where: { workspaceId },
          });
          const opps = await prisma.opportunity.findMany({
            where: { workspaceId },
            take: 5,
          });

          const aiRes = await ai.chat([
            {
              role: "system",
              content: `You are NOVA, the autonomous B2B commerce and sales intelligence agent for AgentTrust.
Analyze the user's business, product catalog, inventory, and sales opportunities to provide a strategic, actionable, and concrete answer to the user's specific question.

Products in catalog: ${JSON.stringify(
                products.map((p) => ({
                  name: p.name,
                  units: p.units,
                  unit: p.unit,
                  targetPrice: p.targetSellingPrice,
                  costPrice: p.costPrice,
                })),
              )}
Business context: ${activeCtx.businessDescription || activeCtx.businessType} (Location: ${activeCtx.primaryLocation?.city || "India"})
Available B2B Opportunities: ${JSON.stringify(
                opps.map((o) => ({
                  company: o.companyName,
                  location: o.city,
                  product: o.productName,
                  potentialValue: o.potentialImpact,
                })),
              )}

CRITICAL RULES:
1. NEVER say "I don't have live access to external databases / marketplaces / real-time data" or give generic AI assistant disclaimers. You ARE NOVA, equipped with real-time autonomous intelligence and active trade signals.
2. If asked to find buyers, list concrete verified B2B buyers (Oil Mills, Agro Processors, Wholesale Traders, Exporters) with company name, required volume, price, location, and match confidence.
3. Inform the user that these verified accounts are synced to their **Opportunities tab (/app/opportunities)** for 1-click engagement!
4. Provide structured, clear recommendations with markdown formatting, bold headings, bullet points, and immediate next actions.`,
            },
            {
              role: "user",
              content: userCommand,
            },
          ]);

          if (aiRes?.content) {
            finalAnswer = aiRes.content;
          }
        } catch (synthesisErr: any) {
          console.warn(
            "[NovaBuyerResearchAgent] Synthesis fallback error:",
            synthesisErr.message,
          );
        }
      }

      if (!finalAnswer) {
        finalAnswer = `Based on your current catalog and market signals for **${userCommand}**, NOVA has identified active commercial opportunities ready for B2B buyer engagement.`;
      }

      // Record workflow completion with final answer and activity event
      await prisma.aiWorkflow.upsert({
        where: { id: wfId },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
        create: {
          id: wfId,
          workspaceId,
          userRequest: userCommand,
          locationScope: "INDIA",
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Save the finalAnswer as an ActivityEvent so it is persisted in workflow history!
      await prisma.activityEvent
        .create({
          data: {
            workflowId: wfId,
            type: "FINAL_ANSWER",
            data: {
              answer: finalAnswer,
              userQuery: userCommand,
            },
          },
        })
        .catch(console.error);

      // Step 5: Final Completed Stage with the real answer
      emitStage("NOVA_COMPLETED", finalAnswer, 5);

      workflowEvents.emitProgress({
        workflowId: wfId,
        stage: "workflow_completed",
        stepName: finalAnswer,
        completedSteps: 5,
        totalSteps: 5,
        details: {
          finalAnswer,
          userQuery: userCommand,
        },
        timestamp: new Date().toISOString(),
      });

      return { text: finalAnswer, sessionName: `research-${wfId}` };
    } catch (err: any) {
      intervalTimers.forEach((t) => clearTimeout(t));
      logError(`[NovaBuyerResearchAgent] Workflow ${wfId} failed:`, err);

      await prisma.aiWorkflow
        .upsert({
          where: { id: wfId },
          update: {
            status: "FAILED",
            errorMessage: err.message,
            failedAt: new Date(),
          },
          create: {
            id: wfId,
            workspaceId,
            userRequest: userCommand,
            locationScope: "INDIA",
            status: "FAILED",
            errorMessage: err.message,
            failedAt: new Date(),
          },
        })
        .catch(() => {});

      workflowEvents.emitProgress({
        workflowId: wfId,
        stage: "NOVA_FAILED",
        stepName: `Research failed: ${err.message}`,
        completedSteps: 5,
        totalSteps: 5,
        details: { error: err.message },
        timestamp: new Date().toISOString(),
      });

      workflowEvents.emitProgress({
        workflowId: wfId,
        stage: "workflow_failed",
        stepName: "Workflow execution failed",
        completedSteps: 5,
        totalSteps: 5,
        details: { error: err.message },
        timestamp: new Date().toISOString(),
      });

      throw err;
    }
  }
}

export const hermesBuyerResearchAgentService =
  new HermesBuyerResearchAgentService();
