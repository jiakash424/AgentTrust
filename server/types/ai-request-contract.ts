export type AIMode =
  | "GENERAL"
  | "BUSINESS"
  | "PRODUCT"
  | "INVENTORY"
  | "OPPORTUNITY"
  | "LEAD"
  | "RESEARCH"
  | "OUTREACH"
  | "WHATSAPP"
  | "EMAIL"
  | "ANALYTICS"
  | "AUTOMATION";

export type AIEntityType =
  | "NONE"
  | "BUSINESS"
  | "PRODUCT"
  | "INVENTORY_ITEM"
  | "LEAD"
  | "OPPORTUNITY"
  | "CAMPAIGN"
  | "CONVERSATION";

export interface AIRequestContract {
  userId?: string;
  workspaceId: string;
  conversationId?: string;
  mode: AIMode;
  entityType: AIEntityType;
  entityId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface EntityContextInfo {
  entityType: AIEntityType;
  entityId: string;
  entityName: string;
  subtitle?: string;
  location?: string;
  matchScore?: number;
}

export interface AIResponsePayload {
  conversationId: string;
  mode: AIMode;
  entityContext?: EntityContextInfo;
  intent: string;
  answer: string;
  verifiedFacts: string[];
  inferences: string[];
  unknowns: string[];
  calculations?: Record<string, any>;
  recommendedActions: Array<{
    action: string;
    label: string;
    payload?: any;
    target?: string;
  }>;
  requiresApproval: boolean;
}
