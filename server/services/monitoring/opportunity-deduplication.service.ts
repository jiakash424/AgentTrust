import crypto from "crypto";
import { normalizeCompanyName, extractDomain } from "../../utils/normalize";

export interface NormalizedIdentity {
  companyName: string;
  normalizedName: string;
  domain?: string;
  cleanPhone?: string;
  cleanEmail?: string;
  city?: string;
  country?: string;
  sourceFingerprint: string;
  evidenceHash: string;
  contentHash: string;
}

export class OpportunityDeduplicationService {
  /**
   * Generates clean normalized identifiers & SHA-256 hashes for deduplication
   */
  public normalizeCandidate(candidate: {
    companyName: string;
    website?: string | null;
    publicEmail?: string | null;
    phone?: string | null;
    city?: string | null;
    country?: string | null;
    verifiedFacts?: string[];
    aiInferences?: string[];
    productFitReason?: string;
    sources?: any[];
  }): NormalizedIdentity {
    const normalizedName = normalizeCompanyName(candidate.companyName);
    const domain = candidate.website
      ? extractDomain(candidate.website)
      : undefined;
    const cleanEmail = candidate.publicEmail?.trim().toLowerCase() || undefined;
    const cleanPhone = candidate.phone?.replace(/[^0-9+]/g, "") || undefined;
    const city = candidate.city?.trim().toLowerCase() || undefined;
    const country = candidate.country?.trim().toLowerCase() || "india";

    // Source fingerprint based on domain / primary source URL / normalized name + city
    const primarySourceUrl =
      candidate.sources?.[0]?.sourceUrl || candidate.website || "";
    const sourceFingerprint = crypto
      .createHash("sha256")
      .update(
        `${normalizedName}:${domain || ""}:${city || ""}:${primarySourceUrl}`,
      )
      .digest("hex");

    // Evidence hash based on verified facts & inferences
    const factsStr = (candidate.verifiedFacts || []).sort().join("|");
    const inferencesStr = (candidate.aiInferences || []).sort().join("|");
    const evidenceHash = crypto
      .createHash("sha256")
      .update(`${factsStr}::${inferencesStr}`)
      .digest("hex");

    // Content hash representing total record state
    const contentHash = crypto
      .createHash("sha256")
      .update(
        `${normalizedName}:${domain || ""}:${cleanEmail || ""}:${cleanPhone || ""}:${candidate.productFitReason || ""}:${evidenceHash}`,
      )
      .digest("hex");

    return {
      companyName: candidate.companyName,
      normalizedName,
      domain,
      cleanPhone,
      cleanEmail,
      city,
      country,
      sourceFingerprint,
      evidenceHash,
      contentHash,
    };
  }

  /**
   * Deterministically checks if two candidates match the exact same company
   */
  public isSameCompany(
    idA: NormalizedIdentity,
    idB: NormalizedIdentity,
  ): boolean {
    // 1. Exact domain match
    if (idA.domain && idB.domain && idA.domain === idB.domain) return true;

    // 2. Exact phone match
    if (
      idA.cleanPhone &&
      idB.cleanPhone &&
      idA.cleanPhone.length >= 7 &&
      idA.cleanPhone === idB.cleanPhone
    )
      return true;

    // 3. Exact email match
    if (idA.cleanEmail && idB.cleanEmail && idA.cleanEmail === idB.cleanEmail)
      return true;

    // 4. Source fingerprint match
    if (idA.sourceFingerprint === idB.sourceFingerprint) return true;

    // 5. Normalized name + City match
    if (
      idA.normalizedName &&
      idB.normalizedName &&
      idA.normalizedName === idB.normalizedName
    ) {
      if (!idA.city || !idB.city || idA.city === idB.city) return true;
    }

    return false;
  }
}

export const opportunityDeduplicationService =
  new OpportunityDeduplicationService();
