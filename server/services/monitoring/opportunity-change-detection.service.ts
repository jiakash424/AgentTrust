import { NormalizedIdentity } from "./opportunity-deduplication.service";

export type OpportunityChangeType =
  | "NEW"
  | "EXISTING_UNCHANGED"
  | "EXISTING_UPDATED"
  | "REJECTED_DUPLICATE"
  | "STALE";

export interface ChangeDetectionResult {
  changeType: OpportunityChangeType;
  existingOpportunityId?: string;
  isMeaningfulChange: boolean;
  changeReasons: string[];
}

export class OpportunityChangeDetectionService {
  /**
   * Compares a newly discovered candidate against existing stored DB opportunities
   */
  public detectChanges(
    newCandidate: NormalizedIdentity & {
      matchScore?: number;
      phone?: string | null;
      publicEmail?: string | null;
      buyingIntentEvidence?: string[];
      buyerBuyingPrice?: number | null;
    },
    existingOpportunity?: any | null,
  ): ChangeDetectionResult {
    if (!existingOpportunity) {
      return {
        changeType: "NEW",
        isMeaningfulChange: true,
        changeReasons: ["Newly discovered B2B commercial opportunity"],
      };
    }

    const reasons: string[] = [];

    // Check 1: Newly discovered contact phone/email
    if (!existingOpportunity.phone && newCandidate.phone) {
      reasons.push("Discovered new contact phone number");
    }
    if (!existingOpportunity.publicEmail && newCandidate.publicEmail) {
      reasons.push("Discovered new verified email contact");
    }

    // Check 2: Buying intent evidence upgrade
    const existingEvidenceCount = Array.isArray(
      existingOpportunity.buyingSignals,
    )
      ? existingOpportunity.buyingSignals.length
      : 0;
    const newEvidenceCount = newCandidate.buyingIntentEvidence?.length || 0;

    if (newEvidenceCount > existingEvidenceCount) {
      reasons.push("Identified new active buying intent signals");
    }

    // Check 3: Significant score increase (> 5 points)
    if (
      newCandidate.matchScore &&
      existingOpportunity.opportunityScore &&
      newCandidate.matchScore - existingOpportunity.opportunityScore >= 5
    ) {
      reasons.push(
        `Match score increased from ${existingOpportunity.opportunityScore} to ${newCandidate.matchScore}`,
      );
    }

    // Check 4: Significant price signal change
    if (
      newCandidate.buyerBuyingPrice &&
      existingOpportunity.buyerBuyingPrice &&
      Math.abs(
        newCandidate.buyerBuyingPrice - existingOpportunity.buyerBuyingPrice,
      ) > 50
    ) {
      reasons.push(`Price signal updated to ₹${newCandidate.buyerBuyingPrice}`);
    }

    // Check 5: Evidence hash change
    if (
      existingOpportunity.evidenceHash &&
      newCandidate.evidenceHash &&
      existingOpportunity.evidenceHash !== newCandidate.evidenceHash
    ) {
      reasons.push("Evidence provenance hash updated with new verified facts");
    }

    const isMeaningfulChange = reasons.length > 0;

    return {
      changeType: isMeaningfulChange
        ? "EXISTING_UPDATED"
        : "EXISTING_UNCHANGED",
      existingOpportunityId: existingOpportunity.id,
      isMeaningfulChange,
      changeReasons:
        reasons.length > 0 ? reasons : ["No material changes detected"],
    };
  }
}

export const opportunityChangeDetectionService =
  new OpportunityChangeDetectionService();
