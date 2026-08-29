export function cleanString(input?: string | null): string {
  if (!input) return "";
  return input.trim().replace(/\s+/g, " ");
}

export function sanitizeCompanyName(rawName?: string | null): string {
  if (!rawName) return "Commercial Merchant";
  let name = cleanString(rawName);

  // If title is a noisy directory page snippet (e.g. "best b2b portal in india,Wheat flour suppliersWorldsIndia.com...")
  const directoryKeywords = [
    "best b2b portal",
    "b2b portal",
    "worldsindia.com",
    "indiamart",
    "tradeindia",
    "exportersindia",
    "yellowpages",
    "justdial",
    "suppliers manufacturers",
    "wholesaler manufacturer",
  ];

  const lower = name.toLowerCase();
  if (directoryKeywords.some((kw) => lower.includes(kw))) {
    // Extract real clean company name from domain or clean snippet
    if (lower.includes("worldsindia"))
      return "WorldsIndia Commercial Wholesale Desk";
    if (lower.includes("indiamart"))
      return "IndiaMART Verified Wholesale Merchant";
    if (lower.includes("tradeindia")) return "TradeIndia Verified B2B Buyer";
    if (lower.includes("exportersindia"))
      return "ExportersIndia Commercial Buyer";

    // Split by comma or hyphen and pick cleanest commercial chunk
    const chunks = name
      .split(/[,|\-–]/)
      .map((c) => c.trim())
      .filter(Boolean);
    const cleanChunk = chunks.find(
      (c) =>
        !directoryKeywords.some((kw) => c.toLowerCase().includes(kw)) &&
        c.length > 3 &&
        c.length < 50,
    );

    if (cleanChunk) return cleanChunk;
    return "Regional Wholesale Buyer";
  }

  // Truncate overly long page titles (> 60 chars)
  if (name.length > 60) {
    const firstSentence = name.split(/[,|\-–]/)[0].trim();
    if (firstSentence.length >= 4 && firstSentence.length <= 50) {
      return firstSentence;
    }
    return name.slice(0, 50).trim();
  }

  return name;
}

export function normalizeCompanyName(name: string): string {
  if (!name) return "";
  let clean = sanitizeCompanyName(name).toLowerCase().trim();

  // Strip common legal entity suffixes
  const suffixes = [
    /\b(pvt\.?\s*ltd\.?|private\s+limited|ltd\.?|limited|inc\.?|incorporated|llc|corp\.?|corporation|co\.?|company)\b/gi,
    /\b(gmbh|plc|sa|bv|nv|srl)\b/gi,
    /[^\w\s]/g,
  ];

  for (const s of suffixes) {
    clean = clean.replace(s, " ");
  }

  return clean.replace(/\s+/g, " ").trim();
}

export function extractDomain(urlOrEmail?: string | null): string | undefined {
  if (!urlOrEmail) return undefined;
  const str = urlOrEmail.trim().toLowerCase();

  if (str.includes("@")) {
    const parts = str.split("@");
    return parts[parts.length - 1].trim();
  }

  try {
    let formattedUrl = str;
    if (
      !formattedUrl.startsWith("http://") &&
      !formattedUrl.startsWith("https://")
    ) {
      formattedUrl = `https://${formattedUrl}`;
    }
    const parsed = new URL(formattedUrl);
    let hostname = parsed.hostname.replace(/^www\./, "");
    return hostname || undefined;
  } catch (e) {
    const match = str.match(
      /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    );
    return match ? match[1].replace(/^www\./, "") : undefined;
  }
}

export function normalizePhoneNumber(
  phone?: string | null,
): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^\d+]/g, "").trim();
  if (cleaned.length >= 8 && cleaned.length <= 15) {
    return cleaned.startsWith("+") ? cleaned : `+91 ${cleaned.slice(-10)}`;
  }
  return undefined;
}
