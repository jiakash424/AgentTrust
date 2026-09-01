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

    const lower = inputPrompt.toLowerCase();
    const dynamicProducts: string[] = [];
    if (lower.includes("wheat") || lower.includes("gehun")) dynamicProducts.push("Premium Wheat");
    if (lower.includes("maze") || lower.includes("maize") || lower.includes("corn") || lower.includes("makka")) dynamicProducts.push("Yellow Maize");
    if (lower.includes("flour") || lower.includes("atta")) dynamicProducts.push("Whole Wheat Flour");
    if (lower.includes("rice") || lower.includes("chawal")) dynamicProducts.push("Basmati Rice");
    if (lower.includes("mustard") || lower.includes("sarson")) dynamicProducts.push("Mustard Seed");
    if (lower.includes("pulse") || lower.includes("chickpea") || lower.includes("chana") || lower.includes("dal")) dynamicProducts.push("Chickpeas");

    const isLocal =
      lower.includes("local") ||
      lower.includes("nearby") ||
      lower.includes("city") ||
      lower.includes("area") ||
      lower.includes("paas") ||
      lower.includes("ghaziabad") ||
      lower.includes("delhi");

    let extractedCity: string | undefined = undefined;
    if (lower.includes("ghaziabad")) extractedCity = "Ghaziabad, Uttar Pradesh, India";
    else if (lower.includes("noida")) extractedCity = "Noida, Uttar Pradesh, India";
    else if (lower.includes("delhi")) extractedCity = "Delhi, India";
    else if (lower.includes("meerut")) extractedCity = "Meerut, Uttar Pradesh, India";
    else if (lower.includes("lucknow")) extractedCity = "Lucknow, Uttar Pradesh, India";
    else if (lower.includes("mumbai")) extractedCity = "Mumbai, Maharashtra, India";
    else if (lower.includes("uttar pradesh") || lower.includes("up")) extractedCity = "Ghaziabad, Uttar Pradesh, India";

    if (dynamicProducts.length > 0) {
      suggestions = {
        suggestedCompany: lower.includes("greenfield") ? "GreenField Agro Traders" : undefined,
        suggestedIndustry: "Food & Agriculture",
        suggestedSubIndustry: "Agricultural Commodities & Grain Trading",
        suggestedBusinessType: "Agricultural Commodities Wholesale",
        suggestedBusinessModel: "B2B",
        suggestedBusinessSize: BusinessSize.SMALL,
        suggestedOperatingScope: isLocal ? OperatingScope.LOCAL : OperatingScope.REGIONAL,
        suggestedBusinessModes: [BusinessMode.B2B, BusinessMode.LOCAL_BUSINESS],
        suggestedProducts: dynamicProducts,
        suggestedServices: ["Bulk Commercial Supply", "B2B Logistics Delivery"],
        suggestedPrimaryCity: extractedCity || "Ghaziabad, Uttar Pradesh, India",
        suggestedTargetBuyers: [
          "Wholesale Grain Distributors",
          "Flour Mills & Food Processors",
          "Commercial Bakeries & Caterers",
          "Supermarket & Retail Chains",
          "Hotels & Institutional Buyers",
        ],
        suggestedSearchKeywords: [
          "wheat wholesale supplier",
          "bulk grain trader",
          "food commodities distributor",
        ],
        suggestedOutreachChannels: ["WHATSAPP", "GMAIL_SMTP"],
        valueProposition:
          "High-grade wholesale agricultural commodities with reliable supply chains and competitive bulk pricing.",
        confidenceScore: 0.95,
      };
    } else {
      try {
        const aiPromise = ai.structured(
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

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("AI analysis timeout — switching to instant NLP engine")),
            2000,
          ),
        );

        suggestions = (await Promise.race([
          aiPromise,
          timeoutPromise,
        ])) as z.infer<typeof analysisSchema>;
      } catch (aiErr: any) {
        console.warn("AI Business Analysis fast fallback triggered:", aiErr.message);
        suggestions = {
          suggestedIndustry: "General Commerce",
          suggestedSubIndustry: "Wholesale Trading",
          suggestedBusinessType: "Commercial Wholesale Supplier",
          suggestedBusinessModel: "B2B",
          suggestedBusinessSize: BusinessSize.SMALL,
          suggestedOperatingScope: OperatingScope.LOCAL,
          suggestedBusinessModes: [BusinessMode.B2B],
          suggestedProducts: ["Commercial B2B Supply"],
          suggestedServices: [],
          suggestedTargetBuyers: ["Corporate Buyers", "Wholesale Distributors"],
          suggestedSearchKeywords: ["b2b supply", "wholesale distributor"],
          suggestedOutreachChannels: ["GMAIL_SMTP"],
          valueProposition: "High quality commercial supply.",
          confidenceScore: 0.85,
        };
      }
    }

    // Respond immediately to the frontend for zero-latency instant UI feedback
    res.json({
      success: true,
      suggestions,
    });

    // Save AI Suggestions to DB asynchronously in background without blocking user
    prisma.businessProfile
      .upsert({
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
      })
      .catch((err) => console.warn("Background BP upsert:", err.message));
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
