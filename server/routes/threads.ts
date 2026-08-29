import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { GmailProvider } from "../providers/communication/gmail";
import { getAIProvider } from "../providers/ai/index";

const router = Router();

router.post("/integrations/gmail/sync", requireAuth, async (req, res) => {
  try {
    // 11. Gmail sync must only fetch AgentTrust-tracked threads.
    const syncs = await prisma.threadSync.findMany({
      where: {
        workspaceId: req.workspaceId,
        status: "ACTIVE",
      },
      include: {
        emailConnection: true,
      },
    });

    if (syncs.length === 0) {
      return res.json({ synced: 0, newReplies: 0 });
    }

    let newRepliesCount = 0;
    const ai = getAIProvider();

    for (const sync of syncs) {
      if (sync.emailConnection.status !== "CONNECTED") continue;

      const gmail = new GmailProvider(sync.emailConnectionId);
      const messages = await gmail.getThreadMessages(sync.gmailThreadId);

      // Basic check: if there are more messages than we sent, it means there's a reply
      // In a robust implementation, we'd store the lastMessageId synced.
      const sentByUs = await prisma.outreachMessage.count({
        where: { gmailThreadId: sync.gmailThreadId },
      });

      if (messages.length > sentByUs) {
        newRepliesCount++;

        // Analyze latest reply
        const latestMessage = messages[messages.length - 1];
        let body = latestMessage.snippet || "No text available"; // Simplified

        const prompt = `
          Analyze this B2B email reply.
          Message: "${body}"
          
          Classify into one of: INTERESTED, NOT_INTERESTED, QUOTE_REQUESTED, NEGOTIATION, MORE_INFORMATION_REQUESTED, FOLLOW_UP_LATER, UNKNOWN.
          Extract any: requestedQuantity, budget, timeline, questions, nextBestAction.
          
          Return JSON (no markdown):
          {
            "classification": "...",
            "extracted": {
              "requestedQuantity": "...",
              "budget": "...",
              "timeline": "...",
              "questions": ["..."],
              "nextBestAction": "..."
            }
          }
        `;

        try {
          const message = await ai.chat([{ role: "user", content: prompt }]);
          const completion = message.content || "";
          const jsonStr = completion.substring(
            completion.indexOf("{"),
            completion.lastIndexOf("}") + 1,
          );
          const parsed = JSON.parse(jsonStr);

          // We'd save this to a Reply/Conversation table (simplified here since it wasn't strictly spec'd in Prisma).
          // For now, mark thread status or update outreach status to indicate reply received
          console.log(
            `[Sync] Thread ${sync.gmailThreadId} classified as ${parsed.classification}`,
          );
        } catch (err) {
          console.error(`Failed to analyze reply for ${sync.gmailThreadId}`);
        }

        // Update sync timestamp
        await prisma.threadSync.update({
          where: { id: sync.id },
          data: { lastSyncedAt: new Date() },
        });
      }
    }

    res.json({ synced: syncs.length, newReplies: newRepliesCount });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync threads" });
  }
});

export default router;
