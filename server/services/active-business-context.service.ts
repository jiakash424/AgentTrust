import { prisma } from "../db";
import { BusinessSize, OperatingScope, BusinessMode } from "@prisma/client";

export interface LocationObject {
  label?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface ResolvedBusinessContext {
  workspaceId: string;
  companyName: string;
  industry: string;
  subIndustry?: string;
  businessType: string;
  businessModel: string;
  businessDescription: string;
  businessSize: BusinessSize;
  operatingScope: OperatingScope;
  businessModes: BusinessMode[];
  primaryLocation: LocationObject | null;
  operatingLocations: LocationObject[];
  localSearchRadius: number;
  products: string[];
  services: string[];
  targetBuyerProfiles: string[];
  targetIndustries: string[];
  searchKeywords: string[];
  primaryGoals: string[];
  valueProposition: string;
  confirmedValues: Record<string, any>;
  aiSuggestions: Record<string, any>;
  isConfigured: boolean;
}

export class ActiveBusinessContextService {
  async resolveContext(workspaceId: string): Promise<ResolvedBusinessContext> {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        businessProfile: true,
        products: true,
      },
    });

    const bp = ws?.businessProfile;
    const confirmed = (bp?.confirmedValues as Record<string, any>) || {};
    const aiSug = (bp?.aiSuggestions as Record<string, any>) || {};

    // 1. User-Confirmed Values ALWAYS win
    const businessSize: BusinessSize = (confirmed.businessSize ||
      bp?.businessSize ||
      aiSug.businessSize ||
      "SMALL") as BusinessSize;

    const operatingScope: OperatingScope = (confirmed.operatingScope ||
      bp?.operatingScope ||
      aiSug.operatingScope ||
      "LOCAL") as OperatingScope;

    let businessModes: BusinessMode[] =
      confirmed.businessModes || bp?.businessModes || aiSug.businessModes || [];
    if (!businessModes || businessModes.length === 0) {
      businessModes =
        operatingScope === "LOCAL" || operatingScope === "CITY"
          ? ["LOCAL_BUSINESS" as BusinessMode, "B2B" as BusinessMode]
          : ["B2B" as BusinessMode];
    }

    // Resolve primary location (No hardcoded fake defaults!)
    let primaryLoc: LocationObject | null =
      confirmed.primaryLocation ||
      bp?.primaryLocation ||
      aiSug.primaryLocation ||
      null;
    if (typeof primaryLoc === "string") {
      primaryLoc = { label: primaryLoc, city: primaryLoc };
    }

    const localRadius =
      confirmed.localSearchRadius ??
      bp?.localSearchRadius ??
      aiSug.localSearchRadius ??
      20;

    // Resolve Products (from DB Catalog + Business Profile)
    const dbProducts = (ws?.products || []).map((p) => p.name);
    const profileProducts = (confirmed.products ||
      bp?.products ||
      aiSug.products ||
      []) as string[];
    const mergedProducts = Array.from(
      new Set([...dbProducts, ...profileProducts]),
    );

    const targetBuyerProfiles = (confirmed.targetBuyerProfiles ||
      bp?.targetBuyerProfiles ||
      aiSug.targetBuyerProfiles ||
      []) as string[];
    const searchKeywords = (confirmed.searchKeywords ||
      bp?.searchKeywords ||
      aiSug.searchKeywords ||
      []) as string[];
    const primaryGoals = (confirmed.primaryGoals ||
      bp?.primaryGoals ||
      aiSug.primaryGoals ||
      []) as string[];

    const isConfigured = !!(
      bp?.industry ||
      bp?.businessType ||
      primaryLoc ||
      mergedProducts.length > 0 ||
      confirmed.industry
    );

    return {
      workspaceId,
      companyName:
        confirmed.companyName || bp?.companyName || ws?.name || "My Business",
      industry:
        confirmed.industry ||
        bp?.industry ||
        aiSug.industry ||
        "General Commerce",
      subIndustry:
        confirmed.subIndustry ||
        bp?.subIndustry ||
        aiSug.subIndustry ||
        undefined,
      businessType:
        confirmed.businessType ||
        bp?.businessType ||
        aiSug.businessType ||
        "Commercial Supplier",
      businessModel:
        confirmed.businessModel ||
        bp?.businessModel ||
        aiSug.businessModel ||
        "B2B",
      businessDescription:
        confirmed.businessDescription ||
        bp?.businessDescription ||
        aiSug.businessDescription ||
        "B2B commercial enterprise",
      businessSize,
      operatingScope,
      businessModes,
      primaryLocation: primaryLoc,
      operatingLocations: (bp?.operatingLocations as LocationObject[]) || [],
      localSearchRadius: Math.max(1, Math.min(localRadius, 500)),
      products: mergedProducts,
      services: (confirmed.services ||
        bp?.services ||
        aiSug.services ||
        []) as string[],
      targetBuyerProfiles,
      targetIndustries: (confirmed.targetIndustries ||
        bp?.targetIndustries ||
        aiSug.targetIndustries ||
        []) as string[],
      searchKeywords,
      primaryGoals,
      valueProposition:
        confirmed.valueProposition ||
        bp?.valueProposition ||
        aiSug.valueProposition ||
        "",
      confirmedValues: confirmed,
      aiSuggestions: aiSug,
      isConfigured,
    };
  }
}

export const activeBusinessContextService = new ActiveBusinessContextService();
