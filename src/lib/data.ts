// All figures are illustrative DEMO DATA for the merchant "Apex Global".

export const merchant = {
  name: "Apex Global",
  owner: "Alex Morgan",
  initials: "AG",
  plan: "Growth",
  region: "Delhi NCR, India",
};

export type AiStatus = "ai-ready" | "needs-attention" | "low-stock" | "draft";

export interface Product {
  id: string;
  name: string;
  category: string;
  units: number;
  price: number;
  moq: number;
  leadTime: string;
  customization: string;
  status: AiStatus;
  readiness: number;
  image: string;
  blurb: string;
}

export const products: Product[] = [];

export type Potential = "high" | "medium-high" | "medium";

export interface Opportunity {
  id: string;
  rank: string;
  title: string;
  potential: Potential;
  valueRange: string;
  confidence: number;
  reason: string;
  action: string;
  status: "ai-discovered" | "researching" | "qualified" | "action-needed";
}

export const opportunities: Opportunity[] = [];

export interface Lead {
  id: string;
  company: string;
  industry: string;
  location: string;
  matchScore: number;
  potential: string;
  email?: string;
  website?: string;
  status: "new" | "researching" | "qualified" | "contacted";
  facts: { type: "fact" | "insight" | "unknown"; text: string }[];
}

export const leads: Lead[] = [];

export type DealStage =
  | "researching"
  | "qualified"
  | "quote-sent"
  | "negotiating"
  | "approval-needed"
  | "closed";

export interface Deal {
  id: string;
  company: string;
  product: string;
  quantity: number;
  value: number;
  stage: DealStage;
  novaNote: string;
}

export const deals: Deal[] = [];

export interface Approval {
  id: string;
  type: "outreach" | "negotiation";
  title: string;
  company: string;
  body: string;
  meta: { label: string; value: string }[];
  recommendation: string;
  preview?: string;
}

export const approvals: Approval[] = [];

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
}

export const integrations: Integration[] = [
  {
    id: "inv",
    name: "Zoho Inventory",
    category: "Inventory",
    description: "Sync live stock levels and SKUs.",
    connected: true,
  },
  {
    id: "crm",
    name: "HubSpot CRM",
    category: "CRM",
    description: "Push qualified leads and deals.",
    connected: true,
  },
  {
    id: "email",
    name: "Gmail",
    category: "Email",
    description: "Send and track NOVA outreach.",
    connected: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    category: "Messaging",
    description:
      "Direct click-to-chat & automated WhatsApp messaging for phone contacts.",
    connected: true,
  },
  {
    id: "acct",
    name: "QuickBooks",
    category: "Accounting",
    description: "Reconcile closed deals and invoices.",
    connected: false,
  },
  {
    id: "shop",
    name: "Shopify",
    category: "Commerce",
    description: "Import catalog and orders.",
    connected: false,
  },
  {
    id: "google",
    name: "Google Workspace",
    category: "Google",
    description: "Calendar, contacts and single sign-on.",
    connected: true,
  },
];

export const buyerActivity: any[] = [];

export const commerceCapabilities = [
  {
    id: "discovery",
    name: "AI Discovery",
    on: true,
    desc: "Allow AI agents to discover compatible offers.",
  },
  {
    id: "intelligence",
    name: "Product Intelligence",
    on: true,
    desc: "AI agents can understand structured product information.",
  },
  {
    id: "availability",
    name: "Live Availability",
    on: true,
    desc: "AI agents can query current availability.",
  },
  {
    id: "quotes",
    name: "Quote Requests",
    on: true,
    desc: "AI buyers can request commercial quotes.",
  },
  {
    id: "negotiation",
    name: "AI Negotiation",
    on: false,
    desc: "Define the limits NOVA can operate within.",
  },
];

export const novaActivity: any[] = [];

export function formatINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}
