import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import {
  generateOAuthState,
  generateCodeVerifier,
  generateCodeChallenge,
  encryptString,
} from "../utils/crypto";
import { GmailSmtpProvider } from "../providers/communication/gmail-smtp";
import { google } from "googleapis";

const router = Router();

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI,
  );
}

const GMAIL_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

// ==========================================
// 1. GMAIL SMTP CONNECT (APP PASSWORD MODE)
// ==========================================
router.post("/gmail-smtp/connect", requireAuth, async (req: any, res) => {
  try {
    const { emailAddress, appPassword } = req.body;
    const workspaceId = req.workspaceId;
    const userId = req.user?.sub;

    if (
      !emailAddress ||
      typeof emailAddress !== "string" ||
      !emailAddress.includes("@")
    ) {
      return res
        .status(400)
        .json({ error: "Please enter a valid Gmail address." });
    }

    if (
      !appPassword ||
      typeof appPassword !== "string" ||
      appPassword.trim().length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Please enter your 16-character Google App Password." });
    }

    const normalizedEmail = emailAddress.trim().toLowerCase();
    const normalizedPassword = appPassword.replace(/\s+/g, "").trim();

    // Test connection with Gmail server BEFORE saving
    const smtp = new GmailSmtpProvider(normalizedEmail, normalizedPassword);
    const verification = await smtp.verifyConnection();

    if (!verification.success) {
      return res.status(400).json({
        error:
          verification.error ||
          "Unable to connect to Gmail. Check that 2-Step Verification is enabled and that the App Password is correct.",
      });
    }

    // Encrypt the App Password securely
    const encrypted = encryptString(normalizedPassword);

    // Upsert EmailConnection for this workspace
    const existing = await prisma.emailConnection.findFirst({
      where: { workspaceId },
    });

    let connection;
    if (existing) {
      connection = await prisma.emailConnection.update({
        where: { id: existing.id },
        data: {
          provider: "GMAIL_SMTP",
          emailAddress: normalizedEmail,
          encryptedSmtpPassword: encrypted.encrypted,
          encryptionIv: encrypted.iv,
          encryptionTag: encrypted.authTag,
          status: "CONNECTED",
          smtpHost: "smtp.gmail.com",
          smtpPort: 465,
          smtpSecure: true,
          userId: userId || existing.userId,
        },
      });
    } else {
      connection = await prisma.emailConnection.create({
        data: {
          workspaceId,
          userId: userId || "system_user",
          provider: "GMAIL_SMTP",
          emailAddress: normalizedEmail,
          encryptedSmtpPassword: encrypted.encrypted,
          encryptionIv: encrypted.iv,
          encryptionTag: encrypted.authTag,
          status: "CONNECTED",
          smtpHost: "smtp.gmail.com",
          smtpPort: 465,
          smtpSecure: true,
        },
      });
    }

    // Record activity events in NOVA History
    await prisma.dealActivity.create({
      data: {
        workspaceId,
        title: "Gmail SMTP connection tested successfully",
        type: "EMAIL_CONNECTED",
        details: { emailAddress: normalizedEmail, provider: "GMAIL_SMTP" },
      },
    });

    await prisma.dealActivity.create({
      data: {
        workspaceId,
        title: `Gmail connected: ${normalizedEmail}`,
        type: "EMAIL_CONNECTED",
        details: { emailAddress: normalizedEmail },
      },
    });

    res.json({
      success: true,
      emailAddress: normalizedEmail,
      provider: "GMAIL_SMTP",
      status: "CONNECTED",
      connectionId: connection.id,
    });
  } catch (err: any) {
    console.error("[Gmail SMTP Connect] Error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to connect Gmail. Please try again." });
  }
});

// ==========================================
// 2. GMAIL OAUTH (OPTIONAL EXISTING MODE)
// ==========================================
router.get("/gmail/connect", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.sub;
    const workspaceId = req.workspaceId;

    if (!userId || !workspaceId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    await prisma.oAuthState.create({
      data: {
        state,
        codeVerifier,
        userId,
        workspaceId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GMAIL_SCOPES,
      prompt: "consent",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256" as any,
    });

    res.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating OAuth URL:", error);
    res.status(500).json({ error: "Failed to initialize Google OAuth" });
  }
});

router.get("/gmail/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(
        `${process.env.APP_BASE_URL}/settings?error=oauth_rejected`,
      );
    }

    if (
      !code ||
      !state ||
      typeof code !== "string" ||
      typeof state !== "string"
    ) {
      return res.redirect(
        `${process.env.APP_BASE_URL}/settings?error=invalid_oauth_response`,
      );
    }

    const oauthState = await prisma.oAuthState.findUnique({
      where: { state },
    });

    if (!oauthState) {
      return res.redirect(
        `${process.env.APP_BASE_URL}/settings?error=state_not_found`,
      );
    }

    if (oauthState.expiresAt < new Date()) {
      await prisma.oAuthState.delete({ where: { state } });
      return res.redirect(
        `${process.env.APP_BASE_URL}/settings?error=state_expired`,
      );
    }

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier: oauthState.codeVerifier || undefined,
    });

    if (!tokens.access_token) {
      throw new Error("No access token returned from Google");
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      throw new Error("Could not retrieve email from Google profile");
    }

    const encryptedAccess = encryptString(tokens.access_token);
    let encryptedRefresh;
    if (tokens.refresh_token) {
      encryptedRefresh = encryptString(tokens.refresh_token);
    }

    const existingConnection = await prisma.emailConnection.findFirst({
      where: { workspaceId: oauthState.workspaceId },
    });

    if (existingConnection) {
      await prisma.emailConnection.update({
        where: { id: existingConnection.id },
        data: {
          provider: "GMAIL_OAUTH",
          emailAddress: userInfo.data.email,
          encryptedAccessToken: encryptedAccess.encrypted,
          encryptionIv: encryptedAccess.iv,
          encryptionTag: encryptedAccess.authTag,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scopes: tokens.scope || GMAIL_SCOPES.join(" "),
          status: "CONNECTED",
          ...(encryptedRefresh
            ? { encryptedRefreshToken: encryptedRefresh.encrypted }
            : {}),
        },
      });
    } else {
      await prisma.emailConnection.create({
        data: {
          workspaceId: oauthState.workspaceId,
          userId: oauthState.userId,
          provider: "GMAIL_OAUTH",
          emailAddress: userInfo.data.email,
          encryptedAccessToken: encryptedAccess.encrypted,
          encryptedRefreshToken: encryptedRefresh
            ? encryptedRefresh.encrypted
            : null,
          encryptionIv: encryptedAccess.iv,
          encryptionTag: encryptedAccess.authTag,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scopes: tokens.scope || GMAIL_SCOPES.join(" "),
          status: "CONNECTED",
        },
      });
    }

    await prisma.oAuthState.delete({ where: { state } });
    res.redirect(
      `${process.env.APP_BASE_URL}/settings?success=gmail_connected`,
    );
  } catch (err) {
    console.error("Callback error:", err);
    res.redirect(`${process.env.APP_BASE_URL}/settings?error=oauth_failed`);
  }
});

// ==========================================
// 3. CONNECTION STATUS
// ==========================================
router.get("/gmail/status", requireAuth, async (req: any, res) => {
  try {
    const connection = await prisma.emailConnection.findFirst({
      where: {
        workspaceId: req.workspaceId,
        status: "CONNECTED",
      },
      select: {
        id: true,
        emailAddress: true,
        provider: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return res.json({
        connected: false,
        status: "DISCONNECTED",
        provider: "GMAIL_SMTP",
        emailAddress: null,
      });
    }

    res.json({
      connected: true,
      provider: connection.provider || "GMAIL_SMTP",
      emailAddress: connection.emailAddress,
      status: connection.status,
      connectionId: connection.id,
      updatedAt: connection.updatedAt,
      connection: connection, // Backwards compatibility for existing UI
    });
  } catch (err) {
    console.error("Status error:", err);
    res.status(500).json({ error: "Failed to fetch email connection status" });
  }
});

// ==========================================
// 4. DISCONNECT
// ==========================================
router.post("/gmail/disconnect", requireAuth, async (req: any, res) => {
  try {
    const { connectionId } = req.body;
    const workspaceId = req.workspaceId;

    const connection = await prisma.emailConnection.findFirst({
      where: {
        workspaceId,
        ...(connectionId ? { id: connectionId } : {}),
      },
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    await prisma.emailConnection.update({
      where: { id: connection.id },
      data: {
        status: "DISCONNECTED",
        encryptedSmtpPassword: null,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        encryptionIv: null,
        encryptionTag: null,
        tokenExpiry: null,
      },
    });

    await prisma.dealActivity.create({
      data: {
        workspaceId,
        title: `Gmail disconnected: ${connection.emailAddress}`,
        type: "EMAIL_DISCONNECTED",
        details: { emailAddress: connection.emailAddress },
      },
    });

    res.json({ success: true, status: "DISCONNECTED" });
  } catch (err) {
    console.error("Disconnect error:", err);
    res.status(500).json({ error: "Failed to disconnect email" });
  }
});

export default router;
