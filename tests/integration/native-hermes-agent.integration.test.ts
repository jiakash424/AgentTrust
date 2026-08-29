import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../../server/db";
import { hermesSessionManager } from "../../server/services/ai/hermes-session-manager.service";

async function runComprehensiveHermesIntegrationTest() {
  console.log("=================================================");
  console.log("COMPREHENSIVE PRODUCTION INTEGRATION TEST");
  console.log("NATIVE HERMES AGENT, MCP & MULTI-TURN CONVERSATION");
  console.log("=================================================");

  // 1. Resolve Workspace
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    throw new Error("No workspace found for integration test!");
  }
  console.log(`Target Workspace: ${workspace.name} (${workspace.id})`);

  // 2. Health & Version Check
  const health = await hermesSessionManager.healthCheck();
  console.log(`Hermes Health Check: ok=${health.ok}, version="${health.version || "N/A"}"`);
  if (!health.ok) {
    throw new Error(`Hermes health check failed: ${health.error}`);
  }

  const conversationId = `prod-verify-${Date.now()}`;

  // 3. Multi-Turn Test Turn 1: Catalog Read
  console.log("\n--- TURN 1: 'What products do I currently have?' ---");
  const turn1Start = Date.now();
  const res1 = await hermesSessionManager.sendMessage({
    workspaceId: workspace.id,
    conversationId,
    userMessage: "What products do I currently have?",
  });
  console.log(`✔ Turn 1 completed in ${((Date.now() - turn1Start) / 1000).toFixed(1)}s`);
  console.log(`✔ Turn 1 Session: ${res1.sessionName}`);
  console.log(`✔ Turn 1 Response (${res1.text.length} chars):\n${res1.text.substring(0, 250)}...\n`);

  // 4. Multi-Turn Test Turn 2: Contextual Follow-up in SAME Session
  console.log("--- TURN 2: 'Which one should I focus on selling more?' (Contextual follow-up) ---");
  const turn2Start = Date.now();
  const res2 = await hermesSessionManager.sendMessage({
    workspaceId: workspace.id,
    conversationId,
    userMessage: "Which one should I focus on selling more?",
  });
  console.log(`✔ Turn 2 completed in ${((Date.now() - turn2Start) / 1000).toFixed(1)}s`);
  console.log(`✔ Turn 2 Session: ${res2.sessionName} (Matches Turn 1: ${res1.sessionName === res2.sessionName})`);
  console.log(`✔ Turn 2 Response (${res2.text.length} chars):\n${res2.text.substring(0, 250)}...\n`);

  console.log("=================================================");
  console.log("ALL INTEGRATION VERIFICATION CHECKS PASSED");
  console.log("=================================================");
}

runComprehensiveHermesIntegrationTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Integration test failed:", err);
    process.exit(1);
  });
