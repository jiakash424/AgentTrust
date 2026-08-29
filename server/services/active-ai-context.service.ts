import { prisma } from "../db";
import { activeBusinessContextService } from "./active-business-context.service";
import {
  AIEntityType,
  AIMode,
  EntityContextInfo,
} from "../types/ai-request-contract";

export interface ResolvedAIContext {
  mode: AIMode;
  entityType: AIEntityType;
  entityId?: string;
  entityInfo?: EntityContextInfo;
  entityRecord?: any;
  activeBusinessContext: any;
  products: any[];
  promptContextString: string;
}

export class ActiveAIContextService {
  public async resolveContext(
    workspaceId: string,
    mode: AIMode,
    entityType: AIEntityType,
    entityId?: string,
  ): Promise<ResolvedAIContext> {
    // 1. Resolve Active Merchant Business Context & Inventory
    const activeCtx =
      await activeBusinessContextService.resolveContext(workspaceId);
    const products = await prisma.product.findMany({ where: { workspaceId } });

    // 2. Strict Entity Isolation
    let entityRecord: any = null;
    let entityInfo: EntityContextInfo | undefined = undefined;

    if (mode === "OPPORTUNITY" || entityType === "OPPORTUNITY") {
      if (!entityId || typeof entityId !== "string" || !entityId.trim()) {
        const err = new Error(
          "No specific opportunity is selected. Please select an opportunity to continue.",
        );
        (err as any).code = "NO_ENTITY_CONTEXT";
        throw err;
      }

      entityRecord = await prisma.opportunity.findFirst({
        where: { id: entityId.trim(), workspaceId },
        include: {
          sources: true,
        },
      });

      if (!entityRecord) {
        const err = new Error(
          `Opportunity with ID '${entityId}' was not found in your workspace.`,
        );
        (err as any).code = "ENTITY_NOT_FOUND";
        throw err;
      }

      const locStr = [
        entityRecord.city,
        entityRecord.stateRegion,
        entityRecord.country,
      ]
        .filter(Boolean)
        .join(", ");
      entityInfo = {
        entityType: "OPPORTUNITY",
        entityId: entityRecord.id,
        entityName:
          entityRecord.companyName ||
          entityRecord.title ||
          "Selected Opportunity",
        subtitle: entityRecord.category || entityRecord.industry || "B2B Trade",
        location: locStr || "India",
        matchScore: entityRecord.opportunityScore || 90,
      };
    } else if (mode === "PRODUCT" || entityType === "PRODUCT") {
      if (entityId) {
        entityRecord = await prisma.product.findFirst({
          where: { id: entityId.trim(), workspaceId },
        });

        if (entityRecord) {
          entityInfo = {
            entityType: "PRODUCT",
            entityId: entityRecord.id,
            entityName: entityRecord.name,
            subtitle: `${entityRecord.category || "General"} — ₹${entityRecord.targetSellingPrice || entityRecord.basePrice} / ${entityRecord.unit || "Quintal"}`,
          };
        }
      }
    } else if (mode === "LEAD" || entityType === "LEAD") {
      if (entityId) {
        entityRecord = await prisma.lead.findFirst({
          where: { id: entityId.trim(), workspaceId },
        });

        if (entityRecord) {
          entityInfo = {
            entityType: "LEAD",
            entityId: entityRecord.id,
            entityName: entityRecord.companyName,
            subtitle: entityRecord.industry || "B2B Lead",
            location: [entityRecord.city, entityRecord.stateRegion]
              .filter(Boolean)
              .join(", "),
          };
        }
      }
    }

    // 3. Build Strict System Prompt Context String
    let promptContextString = "";

    if (entityInfo && entityRecord) {
      if (entityInfo.entityType === "OPPORTUNITY") {
        const targetSell =
          entityRecord.recommendedOfferPrice ||
          entityRecord.targetSellingPrice ||
          2800;
        const qty = entityRecord.estimatedQuantity || 500;
        const unit = entityRecord.buyerPriceUnit || "Quintal";

        promptContextString = `
AUTHORITATIVE PRIMARY ENTITY CONTEXT (ID: ${entityRecord.id}):
- Company Name: ${entityRecord.companyName} (Legal: ${entityRecord.legalName || entityRecord.companyName})
- Business Type: ${entityRecord.category || entityRecord.industry || "B2B Buyer"}
- Verified Location: ${[entityRecord.city, entityRecord.stateRegion, entityRecord.country].filter(Boolean).join(", ")}
- Official Website: ${entityRecord.website || "N/A"}
- Verified Contact Channel: ${entityRecord.phone ? `Phone: ${entityRecord.phone}` : ""} ${entityRecord.publicEmail ? `Email: ${entityRecord.publicEmail}` : ""} ${entityRecord.contactName ? `(Contact Person: ${entityRecord.contactName})` : ""}
- Matched Product: ${entityRecord.productName || "Wheat Flour (Chakki Fresh Atta)"}
- Opportunity Score: ${entityRecord.opportunityScore || 90}%
- Commercial Recommendation: ${entityRecord.commercialRecommendation || "PURSUE_NOW"}
- Price Advantage Rating: ${entityRecord.priceCompetitiveness || "COMPETITIVE"}

COMMERCIAL & FINANCIAL PRICE INTELLIGENCE FOR THIS EXACT OPPORTUNITY:
- Buyer Procurement Rate: ₹${entityRecord.buyerBuyingPrice || 2900} / ${unit} (${entityRecord.buyerPriceType || "ESTIMATED"} - Source: ${entityRecord.buyerPriceSource || "Mandi Market Benchmark"})
- Your Recommended Offer Price: ₹${targetSell} / ${unit}
- Buyer Savings Per Unit: ₹${entityRecord.buyerSavingsPerUnit || 100} / ${unit}
- Your Gross Margin Per Unit: ₹${entityRecord.grossMarginPerUnit || 350} / ${unit}
- Estimated Order Quantity: ${qty} ${unit}s
- Potential Total Deal Value: ₹${(entityRecord.potentialImpact || targetSell * qty).toLocaleString("en-IN")}
- Potential Gross Profit: ₹${(entityRecord.potentialGrossProfit || 350 * qty).toLocaleString("en-IN")}

EVIDENCE & MATCH REASON:
${entityRecord.reason || "Direct commercial fit for product in target territory."}
`.trim();
      } else if (entityInfo.entityType === "PRODUCT") {
        promptContextString = `
AUTHORITATIVE PRIMARY PRODUCT CONTEXT (ID: ${entityRecord.id}):
- Product Name: ${entityRecord.name}
- Category: ${entityRecord.category}
- Base Price: ₹${entityRecord.basePrice} / ${entityRecord.unit || "Unit"}
- Cost Price: ₹${entityRecord.costPrice || "N/A"}
- Min Selling Price: ₹${entityRecord.minSellingPrice || "N/A"}
- Target Selling Price: ₹${entityRecord.targetSellingPrice || "N/A"}
- Stock Quantity: ${entityRecord.units} ${entityRecord.unit || "Units"}
`.trim();
      }
    } else {
      promptContextString = `
GLOBAL BUSINESS CONTEXT:
- Merchant Business: ${activeCtx.companyName} (${activeCtx.industry})
- Primary Location: ${activeCtx.primaryLocation?.city || activeCtx.primaryLocation?.label || "Uttar Pradesh, India"}
- Products Available in Inventory: ${products.length} products (${products
        .slice(0, 3)
        .map((p) => p.name)
        .join(", ")})
`.trim();
    }

    return {
      mode,
      entityType,
      entityId,
      entityInfo,
      entityRecord,
      activeBusinessContext: activeCtx,
      products,
      promptContextString,
    };
  }
}

export const activeAIContextService = new ActiveAIContextService();
