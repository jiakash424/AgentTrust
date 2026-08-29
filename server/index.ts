import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import leadDiscoveryRouter from "./routes/lead-discovery";
import leadsRouter from "./routes/leads";
import integrationsRouter from "./routes/integrations";
import outreachRouter from "./routes/outreach";
import threadsRouter from "./routes/threads";
import workflowsRouter from "./routes/workflows";
import workspacesRouter from "./routes/workspaces";
import diagnosticsRouter from "./routes/diagnostics";
import productsRouter from "./routes/products";
import opportunitiesRouter from "./routes/opportunities";
import conversationsRouter from "./routes/conversations";
import dealsRouter from "./routes/deals";
import leadSearchRouter from "./routes/lead-search";
import healthRouter from "./routes/health";
import businessContextRouter from "./routes/business-context";
import whatsappRouter from "./routes/whatsapp";
import whatsappWebhookRouter from "./routes/whatsapp-webhook";
import aiOrchestratorRouter from "./routes/ai-orchestrator";
import monitoringRouter from "./routes/monitoring";
import { opportunityMonitoringScheduler } from "./services/monitoring/opportunity-monitoring-scheduler";
import { getAIProvider } from "./providers/ai/index";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

import { prisma } from "./db";
export { prisma };

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/lead-search", leadSearchRouter);
app.use("/api", healthRouter);
app.use("/api/lead-discovery", leadDiscoveryRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api", outreachRouter); // mounted at /api so /api/leads/:id/outreach and /api/outreach/:id work
app.use("/api", threadsRouter); // mounted at /api so /api/integrations/gmail/sync works
app.use("/api/leads", leadsRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/workspaces", workspacesRouter);
app.use("/api/diagnostics", diagnosticsRouter);
app.use("/api/products", productsRouter);
app.use("/api/opportunities", opportunitiesRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/business-context", businessContextRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/webhooks/whatsapp", whatsappWebhookRouter);
app.use("/api/ai", aiOrchestratorRouter);
import agentTasksRouter from "./routes/agent-tasks";

app.use("/api/agent", agentTasksRouter);
app.use("/api/monitoring", monitoringRouter);

app.post("/api/test-workflow", async (req, res) => {
  const { runWorkflow } = await import("./routes/lead-discovery");
  try {
    // Find workspace that actually has products
    const workspace =
      (await prisma.workspace.findFirst({
        where: { products: { some: {} } },
      })) || (await prisma.workspace.findFirst());
    if (!workspace) return res.status(400).json({ error: "No workspace" });

    const requestText =
      req.body.userRequest || "Prepare my products for AI buyers";

    const workflow = await prisma.aiWorkflow.create({
      data: {
        workspaceId: workspace.id,
        userRequest: requestText,
        locationScope: "INDIA",
        status: "RUNNING",
      },
    });

    // Run asynchronously
    runWorkflow(
      workflow.id,
      {
        userRequest: requestText,
        locationScope: "INDIA",
      },
      workspace.id,
    ).catch(console.error);

    res.json({ success: true, workflowId: workflow.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/health", async (req, res) => {
  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = "error";
  }

  let aiHealth: {
    ok: boolean;
    model: string;
    provider: string;
    error?: string;
  } = {
    ok: false,
    model: "unknown",
    provider: process.env.AI_PROVIDER || "gemini",
  };

  try {
    const ai = getAIProvider();
    if (ai.healthCheck) {
      const result = await ai.healthCheck();
      aiHealth = { ...result, provider: process.env.AI_PROVIDER || "gemini" };
    } else {
      aiHealth = {
        ok: true,
        model: "unknown",
        provider: process.env.AI_PROVIDER || "gemini",
      };
    }
  } catch (err: any) {
    aiHealth.error = err.message;
  }

  res.json({
    status: "ok",
    database: dbStatus,
    hermesBrain: aiHealth,
    timestamp: new Date().toISOString(),
  });
});

// Production Static Serving
import fs from "fs";
import path from "path";

const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = app.listen(Number(port), "0.0.0.0", () => {
  console.log(`[server]: Server is running at http://0.0.0.0:${port}`);
  opportunityMonitoringScheduler.start(60000);
});

// Graceful Shutdown
const shutdown = (signal: string) => {
  console.log(`[server]: ${signal} received, shutting down gracefully...`);
  opportunityMonitoringScheduler.stop();
  server.close(async () => {
    await prisma.$disconnect();
    console.log("[server]: Closed HTTP connections and Prisma pool.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
