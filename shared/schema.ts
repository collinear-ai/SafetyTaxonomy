import { z } from "zod";

export const frameworkSchema = z.enum([
  "OWASP",
  "NIST", 
  "EU AI Act",
  "US EO 14110",
  "UK AI Whitepaper"
]);

export const taxonomyItemSchema = z.object({
  id: z.string(),
  l1Category: z.string(),
  l2Category: z.string(),
  example: z.string(),
  frameworks: z.array(frameworkSchema),
});

export const taxonomyCategorySchema = z.object({
  name: z.string(),
  color: z.string(),
  subcategories: z.array(taxonomyItemSchema),
  frameworkCoverage: z.record(frameworkSchema, z.number()),
});

export const taxonomyDataSchema = z.object({
  categories: z.array(taxonomyCategorySchema),
  totalItems: z.number(),
  overallCoverage: z.record(frameworkSchema, z.number()),
});

export type Framework = z.infer<typeof frameworkSchema>;
export type TaxonomyItem = z.infer<typeof taxonomyItemSchema>;
export type TaxonomyCategory = z.infer<typeof taxonomyCategorySchema>;
export type TaxonomyData = z.infer<typeof taxonomyDataSchema>;
