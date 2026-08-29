import { extractDomain } from "../utils/normalize";

export class DomainService {
  parseDomain(input?: string | null): string | undefined {
    return extractDomain(input);
  }

  isValidDomain(domain?: string | null): boolean {
    if (!domain) return false;
    const clean = domain.trim().toLowerCase();
    return (
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean) &&
      !clean.endsWith(".local") &&
      !clean.endsWith(".example")
    );
  }

  formatWebsite(domainOrUrl?: string | null): string | undefined {
    const domain = this.parseDomain(domainOrUrl);
    return domain ? `https://${domain}` : undefined;
  }
}

export const domainService = new DomainService();
