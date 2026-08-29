import { Response } from "express";
import { prisma } from "../db";

export class LeadsController {
  async listLeads(req: any, res: Response) {
    try {
      const workspaceId = req.workspaceId;
      const leads = await prisma.lead.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        include: {
          sources: true,
          outreachMessages: true,
        },
      });

      return res.json({ leads });
    } catch (err: any) {
      console.error("[LeadsController] Failed to list leads:", err);
      return res.status(500).json({ error: "Failed to list leads" });
    }
  }

  async getLeadById(req: any, res: Response) {
    try {
      const { id } = req.params;
      const workspaceId = req.workspaceId;

      const lead = await prisma.lead.findFirst({
        where: { id, workspaceId },
        include: {
          sources: true,
          research: true,
          outreachMessages: true,
        },
      });

      if (!lead) return res.status(404).json({ error: "Lead not found" });

      return res.json({ lead });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to fetch lead" });
    }
  }
}

export const leadsController = new LeadsController();
