import { google, gmail_v1 } from "googleapis";
import { prisma } from "../../index";
import { decryptString, encryptString } from "../../utils/crypto";

export class GmailProvider {
  private oauth2Client: any;
  private connectionId: string;

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  /**
   * Initializes the OAuth2Client and sets credentials.
   * If tokens are expired, googleapis will automatically refresh them on the next request,
   * triggering the 'tokens' event, which we listen to and save back to the DB securely.
   */
  async initialize() {
    const connection = await prisma.emailConnection.findUnique({
      where: { id: this.connectionId },
    });

    if (!connection) {
      throw new Error("Gmail connection not found.");
    }

    if (connection.status !== "CONNECTED") {
      throw new Error(`Gmail connection is ${connection.status}`);
    }

    if (
      !connection.encryptedAccessToken ||
      !connection.encryptionIv ||
      !connection.encryptionTag
    ) {
      throw new Error("Missing encrypted tokens or encryption metadata");
    }

    const accessToken = decryptString(
      connection.encryptedAccessToken,
      connection.encryptionIv,
      connection.encryptionTag,
    );
    let refreshToken = null;
    if (connection.encryptedRefreshToken) {
      refreshToken = decryptString(
        connection.encryptedRefreshToken,
        connection.encryptionIv,
        connection.encryptionTag,
      );
    }

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_GMAIL_REDIRECT_URI,
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: connection.tokenExpiry
        ? connection.tokenExpiry.getTime()
        : undefined,
    });

    // Handle token auto-refresh securely
    this.oauth2Client.on("tokens", async (tokens: any) => {
      console.log(
        `[GmailProvider] Tokens refreshed for connection ${this.connectionId}`,
      );

      const newAccess = encryptString(tokens.access_token);
      let newRefresh;
      if (tokens.refresh_token) {
        newRefresh = encryptString(tokens.refresh_token);
      }

      const updateData: any = {
        encryptedAccessToken: newAccess.encrypted,
        encryptionIv: newAccess.iv,
        encryptionTag: newAccess.authTag,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      };

      if (newRefresh) {
        updateData.encryptedRefreshToken = newRefresh.encrypted;
      }

      await prisma.emailConnection.update({
        where: { id: this.connectionId },
        data: updateData,
      });
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    bodyText: string,
  ): Promise<{ messageId: string; threadId: string }> {
    if (!this.oauth2Client) await this.initialize();

    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

    // Format RFC 2822 email
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      bodyText,
    ];
    const messageString = messageParts.join("\n");
    const encodedMessage = Buffer.from(messageString).toString("base64url");

    try {
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      if (!res.data.id || !res.data.threadId) {
        throw new Error("Failed to get messageId or threadId from Google");
      }

      return {
        messageId: res.data.id,
        threadId: res.data.threadId,
      };
    } catch (err: any) {
      if (
        err.response?.status === 400 ||
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        // Mark connection as error/revoked if auth fails completely
        await prisma.emailConnection.update({
          where: { id: this.connectionId },
          data: { status: "ERROR" },
        });
      }
      throw err;
    }
  }

  async getThreadMessages(threadId: string) {
    if (!this.oauth2Client) await this.initialize();

    const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

    try {
      const res = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });

      return res.data.messages || [];
    } catch (err) {
      console.error(`[GmailProvider] Failed to get thread ${threadId}`, err);
      return [];
    }
  }
}
