import { normalizeCompanyName, extractDomain } from "../utils/normalize";

export type SourceAuthority =
  | "OFFICIAL_COMPANY_SOURCE"
  | "FIRST_PARTY_BUSINESS_LISTING"
  | "VERIFIED_PUBLIC_WEB"
  | "COMMERCIAL_DIRECTORY"
  | "MAPS_GEOSPATIAL"
  | "SOCIAL_CONTENT"
  | "ENRICHMENT_API"
  | "UNVERIFIED";

export interface ResolvedSourceEvidence {
  providerName: string;
  sourceType: string;
  sourcePlatform?: string;
  sourceAuthority?: SourceAuthority;
  sourceUrl?: string;
  externalId?: string;
  retrievedAt?: string;
  rawReference?: Record<string, any>;
}

export interface ResolvedEntity {
  id: string;
  companyName: string;
  normalizedName: string;
  legalName?: string;
  domain?: string;
  website?: string;
  industry?: string;
  category?: string;
  country?: string;
  stateRegion?: string;
  city?: string;
  fullAddress?: string;
  phone?: string;
  publicEmail?: string;
  description?: string;
  sources: ResolvedSourceEvidence[];
  mergeConfidence: number;
  mergeReasons: string[];
  rawDiscoveryResults: any[];
}

export class EntityResolutionService {
  /**
   * Stage 1: Deterministic Pre-Analysis Deduplication
   * Groups discovery items by domain, normalized name, phone, or exact URL.
   */
  public stage1Deduplicate(results: any[]): ResolvedEntity[] {
    const entityMap = new Map<string, ResolvedEntity>();

    for (const item of results) {
      const companyName =
        item.companyNameCandidate || item.title || "Discovered Business";
      const normName = normalizeCompanyName(companyName);
      const domain = item.sourceUrl ? extractDomain(item.sourceUrl) : undefined;
      const phone = item.phoneCandidates?.[0];
      const emailDomain = item.emailCandidates?.[0]?.split("@")[1];

      // Form a unique deterministic deduplication key
      let dedupKey = "";
      if (
        domain &&
        !domain.includes("facebook") &&
        !domain.includes("reddit") &&
        !domain.includes("youtube") &&
        !domain.includes("google")
      ) {
        dedupKey = `domain:${domain}`;
      } else if (emailDomain) {
        dedupKey = `emaildomain:${emailDomain}`;
      } else if (phone && phone.length >= 8) {
        dedupKey = `phone:${phone.replace(/\D/g, "")}`;
      } else if (normName && normName.length >= 4) {
        dedupKey = `name:${normName}`;
      } else {
        dedupKey = `id:${item.id}`;
      }

      const existing = entityMap.get(dedupKey);

      const sourceRecord: ResolvedSourceEvidence = {
        providerName: item.provider,
        sourceType: item.sourceType,
        sourcePlatform: item.sourcePlatform,
        sourceAuthority: item.sourceAuthority,
        sourceUrl: item.sourceUrl,
        externalId: item.id,
        retrievedAt: item.createdAt,
        rawReference: { snippet: item.snippet, title: item.title },
      };

      if (existing) {
        existing.sources.push(sourceRecord);
        existing.rawDiscoveryResults.push(item);
        if (!existing.domain && domain) existing.domain = domain;
        if (!existing.website && item.sourceUrl)
          existing.website = item.sourceUrl;
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.publicEmail && item.emailCandidates?.[0])
          existing.publicEmail = item.emailCandidates[0];
        if (!existing.city && item.locationCandidate)
          existing.city = item.locationCandidate;
        if (!existing.mergeReasons.includes(`Deduplicated via ${dedupKey}`)) {
          existing.mergeReasons.push(`Deduplicated via ${dedupKey}`);
        }
      } else {
        entityMap.set(dedupKey, {
          id: `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          companyName,
          normalizedName: normName,
          domain,
          website: item.sourceUrl,
          category: "WHOLESALE BUYER",
          city: item.locationCandidate,
          phone,
          publicEmail: item.emailCandidates?.[0],
          description: item.snippet,
          sources: [sourceRecord],
          mergeConfidence: 0.95,
          mergeReasons: [`Initial match key: ${dedupKey}`],
          rawDiscoveryResults: [item],
        });
      }
    }

    return Array.from(entityMap.values());
  }

  /**
   * Stage 2: Post-Analysis Entity Consolidation
   * Consolidates Stage 1 entities using verified cross-source website domain, address similarity, & location match.
   */
  public stage2Consolidate(entities: ResolvedEntity[]): ResolvedEntity[] {
    const consolidated: ResolvedEntity[] = [];

    for (const entity of entities) {
      const existing = consolidated.find((c) => {
        // High confidence match 1: Domain match
        if (entity.domain && c.domain && entity.domain === c.domain) {
          return true;
        }
        // High confidence match 2: Exact normalized name + City match
        if (
          entity.normalizedName.length > 5 &&
          entity.normalizedName === c.normalizedName &&
          entity.city &&
          c.city &&
          entity.city.toLowerCase() === c.city.toLowerCase()
        ) {
          return true;
        }
        return false;
      });

      if (existing) {
        existing.sources.push(...entity.sources);
        existing.rawDiscoveryResults.push(...entity.rawDiscoveryResults);
        existing.mergeReasons.push(
          `Consolidated Stage 2 match: ${entity.companyName} merged into ${existing.companyName}`,
        );
        existing.mergeConfidence = Math.min(existing.mergeConfidence, 0.9);
      } else {
        consolidated.push(entity);
      }
    }

    return consolidated;
  }
}

export const entityResolutionService = new EntityResolutionService();
