export interface SendMessagePayload {
  to: string;
  text: string;
  previewUrl?: boolean;
}

export interface SendTemplatePayload {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}

export interface SendResponse {
  success: boolean;
  providerMessageId?: string;
  status: string;
  error?: string;
}

export interface IncomingWebhookEvent {
  event: "message" | "status" | "opt_out" | "unknown";
  providerMessageId?: string;
  from?: string;
  to?: string;
  text?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  timestamp?: number;
  rawPayload?: any;
}

export interface WhatsAppProvider {
  sendMessage(payload: SendMessagePayload, config: any): Promise<SendResponse>;
  sendTemplate(
    payload: SendTemplatePayload,
    config: any,
  ): Promise<SendResponse>;
  testConnection(config: any): Promise<{ success: boolean; message: string }>;
  verifyWebhook(query: Record<string, any>, verifyToken: string): string | null;
  parseIncomingWebhook(body: any): IncomingWebhookEvent[];
}

export { MetaWhatsAppCloudProvider } from "./meta-cloud.provider";
