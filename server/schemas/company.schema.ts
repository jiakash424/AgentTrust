import { z } from "zod";

export const SourceEvidenceSchema = z.object({
  providerName: z.string(),
  sourceType: z.enum([
    "APOLLO",
    "FOURSQUARE",
    "TAVILY",
    "HUNTER",
    "OPENSTREETMAP",
    "WEB_SEARCH",
    "OFFICIAL_WEBSITE",
    "DIRECT_DIRECTORY",
  ]),
  sourceUrl: z.string().optional(),
  externalId: z.string().optional(),
  retrievedAt: z.string(),
  rawReference: z.record(z.any()).optional(),
});

export const BusinessCandidateSchema = z.object({
  name: z.string(),
  normalizedName: z.string(),
  legalName: z.string().optional(),
  domain: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  category: z.string().optional(),
  businessType: z.string().optional(),

  country: z.string().optional(),
  stateRegion: z.string().optional(),
  city: z.string().optional(),
  fullAddress: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  phone: z.string().optional(),
  publicEmail: z.string().optional(),
  linkedInUrl: z.string().optional(),

  contactPerson: z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      linkedInUrl: z.string().optional(),
    })
    .optional(),

  employeeCount: z.number().optional(),
  estimatedRevenue: z.string().optional(),
  description: z.string().optional(),

  sources: z.array(SourceEvidenceSchema).default([]),
});
