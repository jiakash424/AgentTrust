/**
 * OpportunityProfitabilityService
 * Centralized deterministic math engine for calculating commercial margins, buyer savings,
 * potential deal values, gross profits, price competitiveness, and commercial recommendations.
 *
 * CORE PRINCIPLE:
 * Deterministic math is kept strictly separate from AI inference.
 * If required values are missing, status returns NOT_ENOUGH_DATA or NEEDS_PRICE_VERIFICATION.
 */

export interface ProfitabilityInput {
  costPrice?: number | null;
  minSellingPrice?: number | null;
  targetSellingPrice?: number | null;
  logisticsCostPerUnit?: number | null;
  buyerBuyingPrice?: number | null;
  buyerPriceType?: string | null; // VERIFIED, ESTIMATED, MARKET_BENCHMARK, UNKNOWN
  buyerPriceConfidence?: string | null; // HIGH, MEDIUM, LOW, UNKNOWN
  estimatedQuantity?: number | null;
  unit?: string | null;
}

export interface ProfitabilityResult {
  recommendedOfferPrice: number | null;
  buyerSavingsPerUnit: number | null;
  grossMarginPerUnit: number | null;
  potentialDealValue: number | null;
  potentialGrossProfit: number | null;
  priceCompetitiveness:
    | "HIGHLY_COMPETITIVE"
    | "COMPETITIVE"
    | "NEUTRAL"
    | "LOW_COMPETITIVENESS"
    | "NOT_ENOUGH_DATA";
  commercialRecommendation:
    "PURSUE_NOW" | "NEGOTIATE" | "LOW_PRIORITY" | "NEEDS_PRICE_VERIFICATION";
  recommendationReason: string;
  hasEnoughData: boolean;
}

export class OpportunityProfitabilityService {
  /**
   * Calculates deterministic profitability & price competitiveness metrics.
   */
  public calculateProfitability(
    input: ProfitabilityInput,
  ): ProfitabilityResult {
    const {
      costPrice,
      minSellingPrice,
      targetSellingPrice,
      logisticsCostPerUnit = 0,
      buyerBuyingPrice,
      buyerPriceType = "UNKNOWN",
      estimatedQuantity,
      unit = "Unit",
    } = input;

    const effectiveLogistics = logisticsCostPerUnit || 0;
    const effectiveCostPrice = (costPrice || 0) + effectiveLogistics;

    // 1. Determine Recommended Offer Price
    // Priority: targetSellingPrice -> minSellingPrice * 1.05 -> costPrice * 1.15 -> buyerBuyingPrice * 0.95
    let recommendedOfferPrice: number | null = null;

    if (targetSellingPrice && targetSellingPrice > 0) {
      recommendedOfferPrice = targetSellingPrice;
    } else if (minSellingPrice && minSellingPrice > 0) {
      recommendedOfferPrice = Math.round(minSellingPrice * 1.04);
    } else if (costPrice && costPrice > 0) {
      recommendedOfferPrice = Math.round(costPrice * 1.15);
    }

    // 2. Buyer Savings Per Unit
    let buyerSavingsPerUnit: number | null = null;
    if (buyerBuyingPrice && buyerBuyingPrice > 0 && recommendedOfferPrice) {
      buyerSavingsPerUnit = Math.round(
        buyerBuyingPrice - recommendedOfferPrice,
      );
    }

    // 3. Gross Margin Per Unit
    let grossMarginPerUnit: number | null = null;
    if (recommendedOfferPrice && costPrice && costPrice > 0) {
      grossMarginPerUnit = Math.round(
        recommendedOfferPrice - effectiveCostPrice,
      );
    }

    // 4. Potential Deal Value & Gross Profit
    let potentialDealValue: number | null = null;
    let potentialGrossProfit: number | null = null;

    const qty = estimatedQuantity || 100;
    if (recommendedOfferPrice) {
      potentialDealValue = Math.round(recommendedOfferPrice * qty);
    }
    if (grossMarginPerUnit !== null) {
      potentialGrossProfit = Math.round(grossMarginPerUnit * qty);
    }

    // Check if we have sufficient pricing data
    const hasPricingData =
      buyerPriceType !== "UNKNOWN" &&
      buyerBuyingPrice !== null &&
      buyerBuyingPrice !== undefined &&
      buyerBuyingPrice > 0;
    const hasUserData =
      costPrice !== null && costPrice !== undefined && costPrice > 0;

    // 5. Determine Price Competitiveness Rating
    let priceCompetitiveness: ProfitabilityResult["priceCompetitiveness"] =
      "NOT_ENOUGH_DATA";

    if (!hasPricingData) {
      priceCompetitiveness = "NOT_ENOUGH_DATA";
    } else if (recommendedOfferPrice && buyerBuyingPrice) {
      const savingsRatio =
        (buyerBuyingPrice - recommendedOfferPrice) / buyerBuyingPrice;
      if (savingsRatio >= 0.08) {
        priceCompetitiveness = "HIGHLY_COMPETITIVE";
      } else if (savingsRatio > 0) {
        priceCompetitiveness = "COMPETITIVE";
      } else if (savingsRatio === 0) {
        priceCompetitiveness = "NEUTRAL";
      } else {
        priceCompetitiveness = "LOW_COMPETITIVENESS";
      }
    }

    // 6. Determine AI Commercial Recommendation & Reason
    let commercialRecommendation: ProfitabilityResult["commercialRecommendation"] =
      "NEEDS_PRICE_VERIFICATION";
    let recommendationReason =
      "Buyer relevance is identified, but insufficient verified pricing data exists.";

    if (!hasPricingData) {
      commercialRecommendation = "NEEDS_PRICE_VERIFICATION";
      recommendationReason =
        "Buyer relevance is high, but there is insufficient reliable pricing data. Verify buyer pricing before outreach.";
    } else if (
      minSellingPrice &&
      buyerBuyingPrice &&
      buyerBuyingPrice < minSellingPrice
    ) {
      commercialRecommendation = "LOW_PRIORITY";
      recommendationReason = `Estimated current buying price (₹${buyerBuyingPrice}/${unit}) is below your minimum profitable price (₹${minSellingPrice}/${unit}).`;
    } else if (
      priceCompetitiveness === "HIGHLY_COMPETITIVE" ||
      priceCompetitiveness === "COMPETITIVE"
    ) {
      if (grossMarginPerUnit !== null && grossMarginPerUnit > 0) {
        commercialRecommendation = "PURSUE_NOW";
        recommendationReason = `The buyer's estimated price (₹${buyerBuyingPrice || 0}/${unit}) is above your minimum profitable threshold. Offering ₹${recommendedOfferPrice}/${unit} gives ₹${buyerSavingsPerUnit}/${unit} savings to buyer and ₹${grossMarginPerUnit}/${unit} gross margin to you.`;
      } else {
        commercialRecommendation = "NEGOTIATE";
        recommendationReason = `Price advantage is small, but higher order volume (${qty} ${unit}s) can produce strong gross profits.`;
      }
    } else if (priceCompetitiveness === "NEUTRAL") {
      commercialRecommendation = "NEGOTIATE";
      recommendationReason =
        "Market parity price. Emphasize product quality, reliability, and volume discounts.";
    } else {
      commercialRecommendation = "LOW_PRIORITY";
      recommendationReason =
        "Current offer price is not competitive against buyer's current purchasing price.";
    }

    return {
      recommendedOfferPrice,
      buyerSavingsPerUnit,
      grossMarginPerUnit,
      potentialDealValue,
      potentialGrossProfit,
      priceCompetitiveness,
      commercialRecommendation,
      recommendationReason,
      hasEnoughData: hasPricingData || hasUserData,
    };
  }
}

export const opportunityProfitabilityService =
  new OpportunityProfitabilityService();
