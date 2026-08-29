import { ResolvedEntity } from "./entity-resolution.service";

export interface EvidenceAnalysisOutput {
  classification:
    | "VERIFIED_BUYER"
    | "HIGH_INTENT_BUYER"
    | "POTENTIAL_BUYER"
    | "RELEVANT_BUSINESS"
    | "SUPPLIER"
    | "COMPETITOR"
    | "REJECTED";
  qualificationReason: string;
  confidenceScore?: number;
  productFit?: string;
  productFitScore?: number;
  buyingIntent?: string;
  buyingIntentScore?: number;
  claims?: string[];
  priceSignal?: any;
}

export interface ScoreBreakdown {
  totalScore: number;
  productFitScore: number; // max 25
  businessRelevanceScore: number; // max 20
  buyingIntentScore: number; // max 30
  locationScore: number; // max 15
  contactabilityScore: number; // max 15
  sourceAuthorityScore: number; // max 15
  verificationScore: number; // max 5
  penalties: number;
  scoreBand: "HOT" | "WARM" | "COLD" | "REJECT";
}

export class OpportunityScoringService {
  /**
   * Computes a multi-factor deterministic match score and score breakdown.
   * Separates product fit from buying intent so that missing public buying intent
   * does not automatically reject a relevant potential buyer.
   */
  public computeDeterministicScore(
    entity: ResolvedEntity,
    analysis: EvidenceAnalysisOutput,
    targetCity?: string,
  ): ScoreBreakdown {
    // 1. Product Fit Score (max 25)
    let productFitScore = 0;
    if (analysis.productFit === "HIGH") productFitScore = 25;
    else if (analysis.productFit === "MEDIUM") productFitScore = 18;
    else if (analysis.productFit === "LOW") productFitScore = 10;

    // 2. Business Relevance Score (max 20)
    let businessRelevanceScore = 15;
    if (
      analysis.classification === "VERIFIED_BUYER" ||
      analysis.classification === "HIGH_INTENT_BUYER" ||
      analysis.classification === "POTENTIAL_BUYER"
    ) {
      businessRelevanceScore = 20;
    } else if (analysis.classification === "RELEVANT_BUSINESS") {
      businessRelevanceScore = 12;
    }

    // 3. Buying Intent Score (max 30) - Independent from Product Fit!
    let buyingIntentScore = 0;
    if (analysis.buyingIntent === "DIRECT_ACTIVE") buyingIntentScore = 30;
    else if (analysis.buyingIntent === "INDIRECT_PROCUREMENT")
      buyingIntentScore = 22;
    else if (analysis.buyingIntent === "IMPLIED_CONSUMER")
      buyingIntentScore = 10;

    // 4. Location Match Score (max 15)
    let locationScore = 10;
    if (
      targetCity &&
      entity.city &&
      entity.city.toLowerCase().includes(targetCity.toLowerCase())
    ) {
      locationScore = 15;
    }

    // 5. Contactability Score (max 15)
    let contactabilityScore = 0;
    if (entity.phone) contactabilityScore += 7;
    if (entity.publicEmail) contactabilityScore += 5;
    if (entity.website) contactabilityScore += 3;

    // 6. Source Authority Score (max 15)
    let sourceAuthorityScore = 0;
    const hasOfficial = entity.sources.some(
      (s) => s.sourceAuthority === "OFFICIAL_COMPANY_SOURCE",
    );
    const hasListing = entity.sources.some(
      (s) => s.sourceAuthority === "FIRST_PARTY_BUSINESS_LISTING",
    );
    if (hasOfficial) sourceAuthorityScore = 15;
    else if (hasListing) sourceAuthorityScore = 12;
    else sourceAuthorityScore = 8;

    // 7. Verification Score (max 5)
    let verificationScore = entity.sources.length >= 2 ? 5 : 2;

    // Penalties
    let penalties = 0;
    if (analysis.classification === "COMPETITOR") penalties += 40;
    if (analysis.classification === "REJECTED") penalties += 60;

    const rawTotal =
      productFitScore +
      businessRelevanceScore +
      buyingIntentScore +
      locationScore +
      contactabilityScore +
      sourceAuthorityScore +
      verificationScore -
      penalties;

    const totalScore = Math.max(0, Math.min(100, rawTotal));

    let scoreBand: ScoreBreakdown["scoreBand"] = "COLD";
    if (totalScore >= 75) scoreBand = "HOT";
    else if (totalScore >= 50) scoreBand = "WARM";
    else if (totalScore < 30) scoreBand = "REJECT";

    return {
      totalScore,
      productFitScore,
      businessRelevanceScore,
      buyingIntentScore,
      locationScore,
      contactabilityScore,
      sourceAuthorityScore,
      verificationScore,
      penalties,
      scoreBand,
    };
  }
}

export const opportunityScoringService = new OpportunityScoringService();
