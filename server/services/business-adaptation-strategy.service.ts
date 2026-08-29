import { ResolvedBusinessContext } from "./active-business-context.service";

export interface AdaptationStrategy {
  discoveryStrategy:
    "LOCAL_LAYERED" | "CITY_DENSITY" | "NATIONAL_B2B_ICP" | "GLOBAL_ENTERPRISE";
  geographicStrategy: {
    type: "RADIUS_LAYERED" | "CITY_BOUNDED" | "REGION_ICP" | "MULTI_COUNTRY";
    primaryCity?: string;
    radiusKm?: number;
    layers: string[];
  };
  preferredDiscoveryProviders: string[];
  targetBuyerStrategy: {
    primaryTargetDescription: string;
    derivedBuyerCategories: string[];
    suggestedKeywords: string[];
  };
  preferredOutreachChannels: Array<
    "WHATSAPP" | "GMAIL_SMTP" | "LOCAL_PHONE" | "MULTI_CHANNEL"
  >;
  dashboardPriorities: Array<{
    id: string;
    label: string;
    description: string;
    count?: number;
  }>;
  workflowComplexity: "SIMPLE" | "STANDARD" | "ADVANCED_ENTERPRISE";
  approvalRequirements: "MINIMAL" | "STANDARD" | "STRICT";
}

export class BusinessAdaptationStrategyService {
  deriveStrategy(ctx: ResolvedBusinessContext): AdaptationStrategy {
    const isLocal =
      ctx.operatingScope === "LOCAL" || ctx.operatingScope === "CITY";
    const isSmall = ctx.businessSize === "SOLO" || ctx.businessSize === "SMALL";
    const isEnterprise =
      ctx.businessSize === "LARGE" ||
      ctx.businessModes.includes("ENTERPRISE" as any);

    const primaryCity =
      ctx.primaryLocation?.city || ctx.primaryLocation?.label || undefined;
    const radius = ctx.localSearchRadius || 20;

    // 1. Geographic Discovery Strategy
    let discoveryStrategy: AdaptationStrategy["discoveryStrategy"] =
      "NATIONAL_B2B_ICP";
    let geoStrategy: AdaptationStrategy["geographicStrategy"];

    if (isLocal) {
      discoveryStrategy =
        ctx.operatingScope === "LOCAL" ? "LOCAL_LAYERED" : "CITY_DENSITY";
      geoStrategy = {
        type: "RADIUS_LAYERED",
        primaryCity,
        radiusKm: radius,
        layers: [
          `Layer 1: Primary search area (${radius} km radius around ${primaryCity || "operating location"})`,
          `Layer 2: Surrounding commercial districts & adjacent localities`,
          `Layer 3: Regional expansion if candidate density is low`,
        ],
      };
    } else if (ctx.operatingScope === "INTERNATIONAL") {
      discoveryStrategy = "GLOBAL_ENTERPRISE";
      geoStrategy = {
        type: "MULTI_COUNTRY",
        layers: [
          "Layer 1: Primary target countries",
          "Layer 2: Cross-border wholesale hubs",
        ],
      };
    } else {
      discoveryStrategy = "NATIONAL_B2B_ICP";
      geoStrategy = {
        type: "REGION_ICP",
        layers: [
          "Layer 1: Key industrial & commercial cities across region/country",
        ],
      };
    }

    // 2. Preferred Discovery Providers
    const preferredProviders = isLocal
      ? ["OPENSTREETMAP", "FOURSQUARE", "TAVILY"]
      : ["APOLLO", "HUNTER", "TAVILY", "OPENSTREETMAP"];

    // 3. Data-driven Target Buyer Strategy (NEVER hardcoded!)
    const derivedBuyerCategories = Array.from(
      new Set([
        ...ctx.targetBuyerProfiles,
        ...(ctx.products.length > 0
          ? ctx.products.map((p) => `B2B buyers of ${p}`)
          : []),
        `${ctx.businessType} clients`,
      ]),
    ).filter(Boolean);

    const suggestedKeywords = Array.from(
      new Set([
        ...ctx.searchKeywords,
        ...ctx.products,
        ctx.industry,
        ...(primaryCity
          ? [`supplier in ${primaryCity}`, `wholesaler in ${primaryCity}`]
          : []),
      ]),
    ).filter(Boolean);

    // 4. Preferred Outreach Channels
    const preferredOutreachChannels: AdaptationStrategy["preferredOutreachChannels"] =
      [];
    if (isLocal && isSmall) {
      preferredOutreachChannels.push("WHATSAPP", "LOCAL_PHONE", "GMAIL_SMTP");
    } else if (isEnterprise) {
      preferredOutreachChannels.push("MULTI_CHANNEL", "GMAIL_SMTP");
    } else {
      preferredOutreachChannels.push("GMAIL_SMTP", "WHATSAPP");
    }

    // 5. Adaptive Dashboard Priorities
    const dashboardPriorities: AdaptationStrategy["dashboardPriorities"] = [];
    if (isLocal && isSmall) {
      dashboardPriorities.push(
        {
          id: "local_leads",
          label: "Nearby Opportunities",
          description: `Potential buyers near ${primaryCity || "your area"}`,
        },
        {
          id: "whatsapp_followup",
          label: "WhatsApp Follow-ups",
          description: "Direct customer communication tasks",
        },
        {
          id: "customer_replies",
          label: "Customer Replies",
          description: "Active inquiries requiring attention",
        },
      );
    } else if (isEnterprise) {
      dashboardPriorities.push(
        {
          id: "pipeline_value",
          label: "Pipeline Velocity",
          description: "Active deals in enterprise pipeline",
        },
        {
          id: "qualified_accounts",
          label: "Qualified ICP Accounts",
          description: "High-fit corporate targets",
        },
        {
          id: "pending_approvals",
          label: "Governance & Approvals",
          description: "Team outreach proposals awaiting sign-off",
        },
        {
          id: "team_analytics",
          label: "Team Performance",
          description: "Multi-channel conversion metrics",
        },
      );
    } else {
      dashboardPriorities.push(
        {
          id: "qualified_leads",
          label: "Qualified Buyers",
          description: "Target B2B accounts matching profile",
        },
        {
          id: "outreach_proposals",
          label: "Pending Email Proposals",
          description: "Drafted sales proposals",
        },
        {
          id: "active_deals",
          label: "Active Deal Negotiation",
          description: "Deals in negotiation stage",
        },
      );
    }

    // 6. Workflow Complexity & Approvals
    const workflowComplexity = isEnterprise
      ? "ADVANCED_ENTERPRISE"
      : isSmall
        ? "SIMPLE"
        : "STANDARD";
    const approvalRequirements = isEnterprise
      ? "STRICT"
      : isSmall
        ? "MINIMAL"
        : "STANDARD";

    return {
      discoveryStrategy,
      geographicStrategy: geoStrategy,
      preferredDiscoveryProviders: preferredProviders,
      targetBuyerStrategy: {
        primaryTargetDescription: `Targeting B2B commercial buyers for ${ctx.products.join(", ") || ctx.businessType}`,
        derivedBuyerCategories,
        suggestedKeywords,
      },
      preferredOutreachChannels,
      dashboardPriorities,
      workflowComplexity,
      approvalRequirements,
    };
  }
}

export const businessAdaptationStrategyService =
  new BusinessAdaptationStrategyService();
