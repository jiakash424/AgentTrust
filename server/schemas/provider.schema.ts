import { z } from "zod";

export const ApolloOrganizationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  website_url: z.string().optional().nullable(),
  blog_url: z.string().optional().nullable(),
  angellist_url: z.string().optional().nullable(),
  linkedin_url: z.string().optional().nullable(),
  twitter_url: z.string().optional().nullable(),
  facebook_url: z.string().optional().nullable(),
  primary_phone: z
    .object({ number: z.string().optional() })
    .optional()
    .nullable(),
  languages: z.array(z.string()).optional(),
  alexa_ranking: z.number().optional().nullable(),
  phone: z.string().optional().nullable(),
  linkedin_id: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional(),
  estimated_num_employees: z.number().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  street_address: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
});

export const FoursquarePlaceSchema = z.object({
  fsq_id: z.string(),
  name: z.string(),
  categories: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string(),
      }),
    )
    .optional(),
  location: z
    .object({
      address: z.string().optional(),
      locality: z.string().optional(),
      region: z.string().optional(),
      country: z.string().optional(),
      postcode: z.string().optional(),
      formatted_address: z.string().optional(),
    })
    .optional(),
  geocodes: z
    .object({
      main: z
        .object({
          latitude: z.number().optional(),
          longitude: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  tel: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
});

export const HunterDomainSearchResultSchema = z.object({
  domain: z.string(),
  disposable: z.boolean().optional(),
  webmail: z.boolean().optional(),
  organization: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  emails: z
    .array(
      z.object({
        value: z.string(),
        type: z.string().optional(),
        confidence: z.number().optional(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        position: z.string().optional().nullable(),
        seniority: z.string().optional().nullable(),
        department: z.string().optional().nullable(),
        linkedin: z.string().optional().nullable(),
        phone_number: z.string().optional().nullable(),
      }),
    )
    .optional()
    .default([]),
});
