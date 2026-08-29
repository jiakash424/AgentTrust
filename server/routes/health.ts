import { Router } from "express";
import { prisma } from "../db";
import { getAIProvider } from "../providers/ai/index";

const router = Router();

router.get("/health", async (_req, res) => {
  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = "error";
  }

  let hermesBrainStatus = "ok";
  try {
    const ai = getAIProvider();
    if (ai.healthCheck) {
      await ai.healthCheck();
    }
  } catch (err) {
    hermesBrainStatus = "error";
  }

  res.json({
    status: "ok",
    database: dbStatus,
    hermesBrain: hermesBrainStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
