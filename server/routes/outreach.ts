import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { getAIProvider } from "../providers/ai/index";
import { GmailSmtpProvider } from "../providers/communication/gmail-smtp";
import { GmailProvider } from "../providers/communication/gmail";
import { decryptString } from "../utils/crypto";
import { syncOutreachToConversationAndDeal } from "../services/sales-pipeline";
import crypto from "crypto";

const router = Router();

function generateMessageHash(subject: string, body: string): string {
  return crypto.createHash("sha256").update(`${subject}:${body}`).digest("hex");
}

// 1. Generate Draft
router.post(
  "/leads/:leadId/outreach/draft",
  requireAuth,
  async (req: any, res) => {
    try {
      const { leadId } = req.params;
      const workspaceId = req.workspaceId;

      const lead = await prisma.lead.findFirst({
        where: { id: leadId, workspaceId },
        include: { research: true },
      });

      if (!lead) return res.status(404).json({ error: "Lead not found" });

      const ai = getAIProvider();

      const prompt = `
      You are an expert B2B sales assistant. 
      Generate a personalized email outreach draft for: ${lead.name}
      Industry: ${lead.industry || "Unknown"}
      Description: ${lead.description || ""}
      Verified Facts: ${lead.research.map((r: any) => JSON.stringify(r.evidence)).join(", ")}
      
      Respond with exactly this JSON format (no markdown tags):
      {
        "subject": "The email subject",
        "body": "The email body",
        "personalizationReason": "Why you chose this approach"
      }
    `;

      const message = await ai.chat([{ role: "user", content: prompt }]);
      const completion = message.content || "";
      let parsed;
      try {
        const jsonStr = completion.substring(
          completion.indexOf("{"),
          completion.lastIndexOf("}") + 1,
        );
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        parsed = {
          subject: `Partnership opportunity with ${lead.name}`,
          body: completion,
          personalizationReason:
            "Generated based on verified public context analysis.",
        };
      }

      const outreach = await prisma.outreachMessage.create({
        data: {
          workspaceId,
          leadId,
          subject: parsed.subject,
          body: parsed.body,
          personalizationReason: parsed.personalizationReason,
          status: "DRAFT",
        },
      });

      res.json({ outreach });
    } catch (error) {
      console.error("Draft generation failed:", error);
      res.status(500).json({ error: "Failed to generate draft" });
    }
  },
);

// 1b. Unified Email Draft Generator for Leads & Opportunities
router.post("/generate-draft", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const {
      opportunityId,
      leadId,
      companyName,
      contactName,
      email,
      productName,
    } = req.body;

    let opp: any = null;
    if (opportunityId) {
      opp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
      });
    }

    const recipientComp =
      companyName || opp?.companyName || opp?.title || "Valued Enterprise";
    const recipientName =
      contactName || opp?.contactName || recipientComp || "Procurement Manager";
    const targetProd =
      productName || opp?.productName || "wholesale commercial supply";
    const targetEmail =
      email || opp?.publicEmail || "procurement@commercial-enterprise.in";

    const activeCtx =
      await prisma.businessProfile.findUnique({ where: { workspaceId } });

    const ai = getAIProvider();
    const prompt = `You are NOVA, an executive B2B Sales Specialist.
Company Profile: ${activeCtx?.companyName || "Commercial Supplier"} (${activeCtx?.industry || "Commerce"}).
Target Recipient: ${recipientName} at ${recipientComp} (Email: ${targetEmail})
Offered Commodity / Product: ${targetProd}
Location: ${opp?.city || "India"}

Generate a highly professional, concise, direct B2B proposal email.
Rules:
- High converting, respectful B2B tone.
- Mention direct factory supply with volume commercial pricing.
- Max 3 short paragraphs.
- Subject line must be clean and compelling.

Respond strictly with this JSON format:
{
  "subject": "The email subject",
  "body": "The email body text",
  "personalizationReason": "Short strategy note explaining why this email fits their procurement"
}`;

    let parsed = {
      subject: `B2B Supply Proposal: Wholesale ${targetProd} for ${recipientComp}`,
      body: `Dear ${recipientName},\n\nI am reaching out regarding bulk procurement of ${targetProd} for ${recipientComp}.\n\nWe provide certified commercial-grade ${targetProd} direct from source with transparent volume pricing and guaranteed logistics schedules.\n\nWould you be open to a brief discussion this week regarding your monthly procurement requirements?\n\nBest regards,\nSales & Commercial Sourcing Team`,
      personalizationReason: `Tailored wholesale supply proposal for ${targetProd} based on verified market requirements.`,
    };

    try {
      const message = await ai.chat([{ role: "user", content: prompt }]);
      const completion = message.content || "";
      const jsonStr = completion.substring(
        completion.indexOf("{"),
        completion.lastIndexOf("}") + 1,
      );
      const parsedAi = JSON.parse(jsonStr);
      if (parsedAi.subject && parsedAi.body) {
        parsed = parsedAi;
      }
    } catch (aiErr) {
      console.warn("AI generation fallback used for email draft:", aiErr);
    }

    res.json({
      success: true,
      subject: parsed.subject,
      body: parsed.body,
      personalizationReason: parsed.personalizationReason,
      recipientEmail: targetEmail,
      recipientName,
      companyName: recipientComp,
    });
  } catch (err: any) {
    console.error("Failed to generate email draft:", err);
    res.status(500).json({ error: "Failed to generate email draft" });
  }
});

// 1c. Create / Submit Email Message
router.post("/messages", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const {
      opportunityId,
      leadId,
      recipientEmail,
      subject,
      body,
      personalizationReason,
      submitForApproval,
    } = req.body;

    if (!subject || !body) {
      return res
        .status(400)
        .json({ error: "Subject and body are required for email outreach." });
    }

    const status = submitForApproval ? "PENDING_APPROVAL" : "DRAFT";

    const msg = await prisma.outreachMessage.create({
      data: {
        workspaceId,
        opportunityId: opportunityId || null,
        leadId: leadId || null,
        subject,
        body,
        personalizationReason: personalizationReason || null,
        status,
      },
    });

    res.json({ success: true, message: msg });
  } catch (err: any) {
    console.error("Failed to create email message:", err);
    res.status(500).json({ error: "Failed to create email message" });
  }
});

// 2. Edit Draft
router.post("/outreach/:id/edit", requireAuth, async (req: any, res) => {
  try {
    const { subject, body } = req.body;

    const outreach = await prisma.outreachMessage.findFirst({
      where: { id: req.params.id, workspaceId: req.workspaceId },
    });

    if (!outreach) return res.status(404).json({ error: "Message not found" });

    const updated = await prisma.outreachMessage.update({
      where: { id: outreach.id },
      data: {
        subject,
        body,
        status: "PENDING_APPROVAL", // Any edit invalidates previous approval
        approvedByUserId: null,
        approvedAt: null,
        messageHash: null,
      },
    });

    res.json({ outreach: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to edit draft" });
  }
});

// 3. Approve Draft
router.post("/outreach/:id/approve", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { emailConnectionId } = req.body;

    const outreach = await prisma.outreachMessage.findFirst({
      where: { id: req.params.id, workspaceId },
    });

    if (!outreach) return res.status(404).json({ error: "Message not found" });

    // Find active connection for workspace if not provided
    const connection = await prisma.emailConnection.findFirst({
      where: {
        workspaceId,
        status: "CONNECTED",
        ...(emailConnectionId ? { id: emailConnectionId } : {}),
      },
    });

    const hash = generateMessageHash(outreach.subject, outreach.body);

    const approved = await prisma.outreachMessage.update({
      where: { id: outreach.id },
      data: {
        status: "APPROVED",
        emailConnectionId: connection?.id || outreach.emailConnectionId,
        approvedByUserId: req.user?.sub,
        approvedAt: new Date(),
        messageHash: hash,
      },
    });

    await prisma.dealActivity.create({
      data: {
        workspaceId,
        leadId: outreach.leadId,
        title: `Outreach approved for draft #${outreach.id.slice(-4)}`,
        type: "OUTREACH_APPROVED",
      },
    });

    // Sync to linked Deal & Conversation
    await syncOutreachToConversationAndDeal(approved.id, workspaceId);

    res.json({
      outreach: approved,
      emailConnected: !!connection,
      emailConnectionRequired: !connection,
    });
  } catch (err) {
    console.error("Failed to approve draft:", err);
    res.status(500).json({ error: "Failed to approve draft" });
  }
});

// 4. Reject Draft
router.post("/outreach/:id/reject", requireAuth, async (req: any, res) => {
  try {
    await prisma.outreachMessage.updateMany({
      where: { id: req.params.id, workspaceId: req.workspaceId },
      data: { status: "REJECTED" },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject draft" });
  }
});

// 5. Send Email (Supports GMAIL_SMTP and GMAIL_OAUTH)
router.post("/outreach/:id/send", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;

    const outreach = await prisma.outreachMessage.findFirst({
      where: { id: req.params.id, workspaceId },
      include: { lead: true },
    });

    if (!outreach) return res.status(404).json({ error: "Message not found" });

    // Verify explicit approval
    if (outreach.status !== "APPROVED") {
      return res
        .status(400)
        .json({ error: "Message must be explicitly APPROVED before sending." });
    }

    // Verify hash integrity
    const currentHash = generateMessageHash(outreach.subject, outreach.body);
    if (outreach.messageHash && outreach.messageHash !== currentHash) {
      return res
        .status(400)
        .json({
          error:
            "Message content was modified after approval. Re-approval required.",
        });
    }

    // Load active email connection for workspace
    const connection = await prisma.emailConnection.findFirst({
      where: { workspaceId, status: "CONNECTED" },
    });

    if (!connection) {
      return res.status(400).json({
        error: "EMAIL_CONNECTION_REQUIRED",
        message:
          "Your outreach is approved but Gmail is not connected yet. Please connect Gmail in Settings.",
      });
    }

    // Update status to SENDING
    await prisma.outreachMessage.update({
      where: { id: outreach.id },
      data: { status: "SENDING" },
    });

    await prisma.dealActivity.create({
      data: {
        workspaceId,
        leadId: outreach.leadId,
        title: "Outreach send started",
        type: "OUTREACH_SENDING",
      },
    });

    const toAddress = outreach.lead?.publicEmail || "test@example.com";
    let messageId = `msg_${Date.now()}`;

    if (
      connection.provider === "GMAIL_SMTP" &&
      connection.encryptedSmtpPassword
    ) {
      // Decrypt SMTP password server-side
      const decryptedPassword = decryptString(
        connection.encryptedSmtpPassword,
        connection.encryptionIv || "",
        connection.encryptionTag || "",
      );

      const smtpProvider = new GmailSmtpProvider(
        connection.emailAddress,
        decryptedPassword,
      );
      const result = await smtpProvider.sendEmail(
        toAddress,
        outreach.subject,
        outreach.body,
      );
      messageId = result.messageId;
    } else if (connection.encryptedAccessToken) {
      // Fallback for OAuth
      const gmail = new GmailProvider(connection.id);
      const result = await gmail.sendEmail(
        toAddress,
        outreach.subject,
        outreach.body,
      );
      messageId = result.messageId;
    } else {
      throw new Error("Invalid or disconnected email connection credentials.");
    }

    const sent = await prisma.outreachMessage.update({
      where: { id: outreach.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        emailConnectionId: connection.id,
        gmailMessageId: messageId,
      },
    });

    await syncOutreachToConversationAndDeal(sent.id, workspaceId);

    await prisma.dealActivity.create({
      data: {
        workspaceId,
        leadId: outreach.leadId,
        title: `Email sent to ${toAddress}`,
        type: "EMAIL_SENT",
        details: { messageId, recipient: toAddress },
      },
    });

    res.json({ success: true, outreach: sent });
  } catch (err: any) {
    console.error("Failed to send email:", err.message);

    // Revert status on failure & log failure activity
    await prisma.outreachMessage
      .update({
        where: { id: req.params.id },
        data: { status: "APPROVED" },
      })
      .catch(console.error);

    await prisma.dealActivity
      .create({
        data: {
          workspaceId: req.workspaceId,
          title: "Email sending failed",
          type: "EMAIL_FAILED",
          details: { error: err.message },
        },
      })
      .catch(console.error);

    res.status(500).json({ error: err.message || "Failed to send email" });
  }
});

// 6. Bulk Send Endpoint for multiple approved outreach messages
router.post("/outreach/send-bulk", requireAuth, async (req: any, res) => {
  try {
    const { outreachIds } = req.body;
    const workspaceId = req.workspaceId;

    if (!Array.isArray(outreachIds) || outreachIds.length === 0) {
      return res.status(400).json({ error: "outreachIds array is required" });
    }

    const connection = await prisma.emailConnection.findFirst({
      where: { workspaceId, status: "CONNECTED" },
    });

    if (!connection) {
      return res.status(400).json({
        error: "EMAIL_CONNECTION_REQUIRED",
        message: "Gmail connection is required before sending.",
      });
    }

    const messagesToSend = await prisma.outreachMessage.findMany({
      where: {
        id: { in: outreachIds },
        workspaceId,
        status: "APPROVED",
      },
      include: { lead: true },
    });

    if (messagesToSend.length === 0) {
      return res
        .status(400)
        .json({ error: "No approved messages ready for sending." });
    }

    let smtpProvider: GmailSmtpProvider | null = null;
    if (
      connection.provider === "GMAIL_SMTP" &&
      connection.encryptedSmtpPassword
    ) {
      const decryptedPassword = decryptString(
        connection.encryptedSmtpPassword,
        connection.encryptionIv || "",
        connection.encryptionTag || "",
      );
      smtpProvider = new GmailSmtpProvider(
        connection.emailAddress,
        decryptedPassword,
      );
    }

    const sentResults = [];
    // Sequential send to avoid Gmail rate limits
    for (const msg of messagesToSend) {
      try {
        await prisma.outreachMessage.update({
          where: { id: msg.id },
          data: { status: "SENDING" },
        });

        const toAddress = msg.lead?.publicEmail || "test@example.com";
        let messageId = `msg_${Date.now()}`;

        if (smtpProvider) {
          const res = await smtpProvider.sendEmail(
            toAddress,
            msg.subject,
            msg.body,
          );
          messageId = res.messageId;
        } else if (connection.encryptedAccessToken) {
          const gmail = new GmailProvider(connection.id);
          const res = await gmail.sendEmail(toAddress, msg.subject, msg.body);
          messageId = res.messageId;
        }

        const updated = await prisma.outreachMessage.update({
          where: { id: msg.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            emailConnectionId: connection.id,
            gmailMessageId: messageId,
          },
        });

        await prisma.dealActivity.create({
          data: {
            workspaceId,
            leadId: msg.leadId,
            title: `Email sent to ${toAddress}`,
            type: "EMAIL_SENT",
            details: { messageId, recipient: toAddress },
          },
        });

        sentResults.push(updated);
        // Small 500ms delay between emails
        await new Promise((r) => setTimeout(r, 500));
      } catch (err: any) {
        console.error(`Failed sending outreach #${msg.id}:`, err.message);
        await prisma.outreachMessage.update({
          where: { id: msg.id },
          data: { status: "APPROVED" },
        });
      }
    }

    res.json({
      success: true,
      sentCount: sentResults.length,
      outreach: sentResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Bulk send failed" });
  }
});

// 7. GET /api/approvals — Fetch real pending outreach & negotiation approvals for workspace
router.get("/approvals", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;

    const messages = await prisma.outreachMessage.findMany({
      where: {
        workspaceId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        opportunity: true,
        lead: true,
        deal: true,
      },
    });

    const waMessages = await prisma.whatsAppMessage.findMany({
      where: {
        workspaceId,
      },
      orderBy: { createdAt: "desc" },
    });

    const waApprovals = waMessages.map((w) => {
      let cleanPhone = w.recipientPhone || "Verified Account";
      if (cleanPhone.length > 13) {
        cleanPhone = cleanPhone.slice(-10);
      }
      if (cleanPhone.length === 10) {
        cleanPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
      } else if (!cleanPhone.startsWith("+") && /^\d+$/.test(cleanPhone)) {
        cleanPhone = `+${cleanPhone}`;
      }

      return {
        id: w.id,
        company: `WhatsApp: ${cleanPhone}`,
        type: "whatsapp_outreach",
        status: w.status,
        subject: `WhatsApp Pitch to ${cleanPhone}`,
        body: w.content,
        preview: w.content,
        recommendation: `Approve and transmit WhatsApp message via official API`,
        meta: [
          { label: "Channel", value: "WhatsApp Business API" },
          { label: "Recipient Phone", value: cleanPhone },
          { label: "Status", value: (w.status || "PENDING").replace(/_/g, " ") },
        ],
      };
    });

    const emailApprovals = messages.map((m) => {
      const company =
        m.opportunity?.companyName ||
        m.lead?.name ||
        m.deal?.companyName ||
        "Qualified Opportunity";
      const targetProduct =
        m.opportunity?.productName || m.deal?.productName || "B2B Supply";
      const city = m.opportunity?.city || m.lead?.location || "India";

      return {
        id: m.id,
        company,
        type: "outreach",
        status: m.status, // DRAFT, PENDING_APPROVAL, APPROVED, SENT, REJECTED
        subject: m.subject,
        body:
          m.personalizationReason ||
          "Generated based on verified commercial procurement signals.",
        preview: m.body,
        recommendation: `Dispatch personalized bulk procurement offer for ${targetProduct}`,
        meta: [
          { label: "Target Company", value: company },
          { label: "Product Offered", value: targetProduct },
          { label: "Location", value: city },
          { label: "Current Stage", value: m.status },
        ],
      };
    });

    res.json({ approvals: [...waApprovals, ...emailApprovals] });
  } catch (err: any) {
    console.error("Failed to fetch approvals:", err);
    res.status(500).json({ error: "Failed to fetch approvals" });
  }
});

export default router;
