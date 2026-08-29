import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { getAIProvider } from "../providers/ai/index";
import { activeBusinessContextService } from "../services/active-business-context.service";
import { businessAdaptationStrategyService } from "../services/business-adaptation-strategy.service";
import { z } from "zod";
import { BusinessSize, OperatingScope, BusinessMode } from "@prisma/client";

const router = Router();

// 1. GET /api/business-context — Returns resolved Active Context + Business Strategy
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const resolvedContext =
      await activeBusinessContextService.resolveContext(workspaceId);
    const strategy =
      businessAdaptationStrategyService.deriveStrategy(resolvedContext);

    const profile = await prisma.businessProfile.findUnique({
      where: { workspaceId },
    });

    res.json({
      profile,
      resolvedContext,
      strategy,
    });
  } catch (err: any) {
    console.error("Failed to fetch business context:", err);
    res.status(500).json({ error: "Failed to load business context" });
  }
});

// 2. POST /api/business-context/analyze — AI Structured Analysis (SUGGESTIONS ONLY, DOES NOT OVERWRITE CONFIRMED VALUES)
router.post("/analyze", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { text, description, currentInput } = req.body;
    const inputPrompt =
      text ||
      description ||
      currentInput ||
      "Wholesale commercial B2B business";

    const ai = getAIProvider();

    const analysisSchema = z.object({
      suggestedCompany: z.string().optional(),
      suggestedIndustry: z.string(),
      suggestedSubIndustry: z.string().optional(),
      suggestedBusinessType: z.string(),
      suggestedBusinessModel: z.enum(["B2B", "B2C", "HYBRID"]),
      suggestedBusinessSize: z.nativeEnum(BusinessSize),
      suggestedOperatingScope: z.nativeEnum(OperatingScope),
      suggestedBusinessModes: z.array(z.nativeEnum(BusinessMode)),
      suggestedProducts: z.array(z.string()),
      suggestedServices: z.array(z.string()).optional(),
      suggestedTargetBuyers: z.array(z.string()),
      suggestedSearchKeywords: z.array(z.string()),
      suggestedOutreachChannels: z.array(z.string()),
      suggestedPrimaryCity: z.string().optional(),
      valueProposition: z.string(),
      confidenceScore: z.number(),
    });

    let suggestions: z.infer<typeof analysisSchema>;

    try {
      suggestions = await ai.structured(
        [
          {
            role: "system",
            content: `You are NOVA, an expert B2B AI Business Intelligence Analyst.
Analyze the merchant's business description and extract comprehensive structured suggestions.
Determine suggested industry, business size (SOLO, SMALL, MEDIUM, LARGE), operating scope (LOCAL, CITY, REGIONAL, NATIONAL, INTERNATIONAL), business modes (LOCAL_BUSINESS, B2B, B2C, MANUFACTURER, SERVICE_BUSINESS, ENTERPRISE), products, target buyer profiles, search keywords, and primary operating city if mentioned.
Respond ONLY with JSON matching the schema.`,
          },
          {
            role: "user",
            content: `Analyze this business description: "${inputPrompt}"`,
          },
        ],
        analysisSchema,
      );
    } catch (aiErr: any) {
      console.warn("AI Business Analysis fallback triggered:", aiErr.message);
      const lower = inputPrompt.toLowerCase();

      const isWheat =
        lower.includes("wheat") ||
        lower.includes("atta") ||
        lower.includes("flour") ||
        lower.includes("grain") ||
        lower.includes("gehun");
      const isLocal =
        lower.includes("local") ||
        lower.includes("nearby") ||
        lower.includes("city") ||
        lower.includes("area") ||
        lower.includes("paas");

      suggestions = {
        suggestedIndustry: isWheat ? "Food & Agriculture" : "General Commerce",
        suggestedSubIndustry: isWheat
          ? "Flour & Grain Milling"
          : "Wholesale Trading",
        suggestedBusinessType: isWheat
          ? "Flour & Grain Trading"
          : "Commercial Wholesale Supplier",
        suggestedBusinessModel: "B2B",
        suggestedBusinessSize: isWheat
          ? BusinessSize.SMALL
          : BusinessSize.SMALL,
        suggestedOperatingScope: isLocal
          ? OperatingScope.LOCAL
          : OperatingScope.LOCAL,
        suggestedBusinessModes: isLocal
          ? [BusinessMode.LOCAL_BUSINESS, BusinessMode.B2B]
          : [BusinessMode.B2B],
        suggestedProducts: isWheat
          ? ["Whole Wheat (Gehun)", "Chakki Fresh Atta", "Maida", "Sooji"]
          : ["Commercial B2B Supply"],
        suggestedServices: isWheat
          ? ["Bulk Grain Milling", "Custom Packaging"]
          : [],
        suggestedTargetBuyers: isWheat
          ? [
              "Wholesalers",
              "Grain Distributors",
              "Bakeries",
              "Restaurants",
              "Hotels",
              "Food Manufacturers",
              "Retail Chains",
            ]
          : ["Corporate Buyers", "Wholesale Distributors"],
        suggestedSearchKeywords: isWheat
          ? ["wheat wholesale", "atta flour supplier", "grain mill trader"]
          : ["b2b supply", "wholesale distributor"],
        suggestedOutreachChannels: isLocal
          ? ["WHATSAPP", "GMAIL_SMTP"]
          : ["GMAIL_SMTP"],
        valueProposition: isWheat
          ? "Direct factory chakki fresh wheat flour and high-grade wheat grain with volume pricing."
          : "High quality commercial supply.",
        confidenceScore: 0.92,
      };
    }

    // Save AI Suggestions to PostgreSQL without overwriting user-confirmed values!
    const updatedBp = await prisma.businessProfile.upsert({
      where: { workspaceId },
      update: {
        aiSuggestions: suggestions,
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        companyName: suggestions.suggestedCompany || "My Business",
        industry: suggestions.suggestedIndustry,
        subIndustry: suggestions.suggestedSubIndustry || null,
        businessType: suggestions.suggestedBusinessType,
        businessModel: suggestions.suggestedBusinessModel,
        businessSize: suggestions.suggestedBusinessSize,
        operatingScope: suggestions.suggestedOperatingScope,
        businessModes: suggestions.suggestedBusinessModes,
        products: suggestions.suggestedProducts,
        targetBuyerProfiles: suggestions.suggestedTargetBuyers,
        searchKeywords: suggestions.suggestedSearchKeywords,
        valueProposition: suggestions.valueProposition,
        aiSuggestions: suggestions,
        confidenceScore: suggestions.confidenceScore,
      },
    });

    const resolvedContext =
      await activeBusinessContextService.resolveContext(workspaceId);
    const strategy =
      businessAdaptationStrategyService.deriveStrategy(resolvedContext);

    res.json({
      success: true,
      suggestions,
      profile: updatedBp,
      resolvedContext,
      strategy,
    });
  } catch (err: any) {
    console.error("Failed to analyze business context:", err);
    res
      .status(500)
      .json({ error: err.message || "Failed to analyze business description" });
  }
});

// 3. PUT /api/business-context — Save Confirmed Business Profile (USER CONFIRMED VALUES TAKE HIGHEST PRIORITY)
router.put("/", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const body = req.body;

    const existing = await prisma.businessProfile.findUnique({
      where: { workspaceId },
    });
    const prevConfirmed =
      (existing?.confirmedValues as Record<string, any>) || {};

    const newConfirmed = {
      ...prevConfirmed,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    const updated = await prisma.businessProfile.upsert({
      where: { workspaceId },
      update: {
        ...(body.companyName ? { companyName: body.companyName } : {}),
        ...(body.industry ? { industry: body.industry } : {}),
        ...(body.subIndustry !== undefined
          ? { subIndustry: body.subIndustry }
          : {}),
        ...(body.businessType ? { businessType: body.businessType } : {}),
        ...(body.businessModel ? { businessModel: body.businessModel } : {}),
        ...(body.businessSize
          ? { businessSize: body.businessSize as BusinessSize }
          : {}),
        ...(body.operatingScope
          ? { operatingScope: body.operatingScope as OperatingScope }
          : {}),
        ...(body.businessModes
          ? { businessModes: body.businessModes as BusinessMode[] }
          : {}),
        ...(body.primaryLocation !== undefined
          ? { primaryLocation: body.primaryLocation }
          : {}),
        ...(body.localSearchRadius !== undefined
          ? { localSearchRadius: Number(body.localSearchRadius) }
          : {}),
        ...(body.products ? { products: body.products } : {}),
        ...(body.services ? { services: body.services } : {}),
        ...(body.targetBuyerProfiles
          ? { targetBuyerProfiles: body.targetBuyerProfiles }
          : {}),
        ...(body.searchKeywords ? { searchKeywords: body.searchKeywords } : {}),
        ...(body.primaryGoals ? { primaryGoals: body.primaryGoals } : {}),
        ...(body.valueProposition
          ? { valueProposition: body.valueProposition }
          : {}),
        confirmedValues: newConfirmed,
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        companyName: body.companyName || "My Business",
        industry: body.industry || "General Commerce",
        subIndustry: body.subIndustry || null,
        businessType: body.businessType || "B2B Merchant",
        businessModel: body.businessModel || "B2B",
        businessSize: body.businessSize || BusinessSize.SMALL,
        operatingScope: body.operatingScope || OperatingScope.LOCAL,
        businessModes: body.businessModes || [
          BusinessMode.LOCAL_BUSINESS,
          BusinessMode.B2B,
        ],
        primaryLocation: body.primaryLocation || null,
        localSearchRadius: body.localSearchRadius
          ? Number(body.localSearchRadius)
          : 20,
        products: body.products || [],
        targetBuyerProfiles: body.targetBuyerProfiles || [],
        searchKeywords: body.searchKeywords || [],
        valueProposition: body.valueProposition || "",
        confirmedValues: newConfirmed,
      },
    });

    const resolvedContext =
      await activeBusinessContextService.resolveContext(workspaceId);
    const strategy =
      businessAdaptationStrategyService.deriveStrategy(resolvedContext);

    res.json({
      profile: updated,
      resolvedContext,
      strategy,
    });
  } catch (err: any) {
    console.error("Failed to update business context:", err);
    res.status(500).json({ error: "Failed to update business profile" });
  }
});

export default router;
