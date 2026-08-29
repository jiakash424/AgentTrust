import { Request, Response } from "express";
import { z } from "zod";
import { hermesBuyerResearchAgentService } from "../services/hermes-buyer-research-agent.service";
import { workflowEvents } from "../events/workflow-events";
import { prisma } from "../db";

const InlineSearchCriteriaSchema = z.object({
  productName: z.string().default("Goods"),
  targetCities: z.array(z.string()).optional(),
  targetCountries: z.array(z.string()).optional(),
  userRequest: z.string().optional(),
});

export class LeadSearchController {
  async search(req: any, res: Response) {
    try {
      const workspaceId = req.workspaceId;
      if (!workspaceId) {
        return res
          .status(400)
          .json({ error: "x-workspace-id header is required" });
      }

      const validated = InlineSearchCriteriaSchema.parse(req.body);
      const userReq =
        validated.userRequest ||
        `${validated.productName} in ${validated.targetCities?.join(", ") || validated.targetCountries?.join(", ") || "India"}`;

      // Create workflow DB record
      const workflow = await prisma.aiWorkflow.create({
        data: {
          workspaceId,
          userId: req.user?.sub || null,
          userRequest: userReq,
          locationScope: validated.targetCountries?.[0] || "INDIA",
          customLocation: validated.targetCities?.join(", "),
          status: "RUNNING",
        },
      });

      // Execute Hermes Research Agent asynchronously
      hermesBuyerResearchAgentService
        .researchBuyers(workspaceId, userReq, workflow.id)
        .catch(console.error);

      return res.json({
        success: true,
        workflowId: workflow.id,
        message: "Multi-source lead discovery workflow initiated successfully.",
      });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid search criteria", details: err.errors });
      }
      console.error("[LeadSearchController] Error starting search:", err);
      return res
        .status(500)
        .json({ error: err.message || "Failed to start lead search" });
    }
  }

  async streamProgress(req: Request, res: Response) {
    const workflowId = String(req.params.workflowId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // Register SSE client
    workflowEvents.registerStream(workflowId, res);

    // Immediately send current workflow status & history events
    try {
      const workflow = await prisma.aiWorkflow.findUnique({
        where: { id: workflowId },
      });

      if (workflow) {
        const initialPayload = `data: ${JSON.stringify({
          workflowId: workflow.id,
          stage:
            workflow.status === "COMPLETED"
              ? "workflow_completed"
              : "workflow_started",
          stepName: `Workflow status: ${workflow.status}`,
          completedSteps: workflow.status === "COMPLETED" ? 8 : 1,
          totalSteps: 8,
          timestamp: new Date().toISOString(),
        })}\n\n`;
        res.write(initialPayload);
      }
    } catch (e) {
      // Ignore
    }
  }
}

export const leadSearchController = new LeadSearchController();
