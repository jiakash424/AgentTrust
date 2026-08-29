import nodemailer from "nodemailer";
import { encryptString, decryptString } from "../../utils/crypto";

export interface SendEmailOptions {
  fromName?: string;
  replyTo?: string;
  html?: string;
}

export class GmailSmtpProvider {
  private emailAddress: string;
  private appPassword: string;

  constructor(emailAddress: string, appPassword: string) {
    this.emailAddress = emailAddress.trim();
    // Normalize app password by stripping spaces
    this.appPassword = appPassword.replace(/\s+/g, "").trim();
  }

  /**
   * Helper to create a Nodemailer transport.
   * Defaults to SSL port 465, with fallback to TLS port 587.
   */
  private createTransporter(port = 465, secure = true) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port,
      secure,
      auth: {
        user: this.emailAddress,
        pass: this.appPassword,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  /**
   * Test & verify SMTP credentials with Gmail server.
   */
  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Primary attempt: Port 465 (SSL)
      const primaryTransporter = this.createTransporter(465, true);
      await primaryTransporter.verify();
      return { success: true };
    } catch (primaryErr: any) {
      console.warn(
        "[Gmail SMTP] Port 465 verification failed, attempting Port 587 fallback...",
        primaryErr.message,
      );
      try {
        // Fallback attempt: Port 587 (STARTTLS)
        const fallbackTransporter = this.createTransporter(587, false);
        await fallbackTransporter.verify();
        return { success: true };
      } catch (fallbackErr: any) {
        console.error("[Gmail SMTP] Verification failed:", fallbackErr.message);

        let userError =
          "Unable to connect to Gmail. Check that 2-Step Verification is enabled and that the App Password is correct.";
        if (
          fallbackErr.message?.includes("Invalid login") ||
          fallbackErr.message?.includes("535-5.7.8")
        ) {
          userError =
            "Invalid Gmail address or App Password. Please ensure 2-Step Verification is enabled on your Google Account and generate a new 16-character App Password.";
        }

        return { success: false, error: userError };
      }
    }
  }

  /**
   * Send an outreach email using verified Nodemailer transport.
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    options?: SendEmailOptions,
  ): Promise<{ messageId: string }> {
    let transporter = this.createTransporter(465, true);

    // Convert plain text body linebreaks to basic HTML formatting if HTML not provided
    const htmlContent = options?.html || body.replace(/\n/g, "<br/>");

    const mailOptions = {
      from: options?.fromName
        ? `"${options.fromName}" <${this.emailAddress}>`
        : this.emailAddress,
      to,
      subject,
      text: body,
      html: htmlContent,
      replyTo: options?.replyTo || this.emailAddress,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(
        `[Gmail SMTP] Sent email to ${to}, MessageID: ${info.messageId}`,
      );
      return { messageId: info.messageId || `smtp_${Date.now()}` };
    } catch (err: any) {
      console.warn(
        "[Gmail SMTP] Send via 465 failed, retrying on 587...",
        err.message,
      );
      // Fallback retry on 587
      const fallbackTransporter = this.createTransporter(587, false);
      const info = await fallbackTransporter.sendMail(mailOptions);
      return { messageId: info.messageId || `smtp_${Date.now()}` };
    }
  }

  /**
   * Get safe connection metadata without password.
   */
  getConnectionStatus() {
    return {
      provider: "GMAIL_SMTP",
      emailAddress: this.emailAddress,
      status: "CONNECTED",
      host: "smtp.gmail.com",
      port: 465,
    };
  }
}
