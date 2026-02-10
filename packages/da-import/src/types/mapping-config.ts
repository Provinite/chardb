import { z } from "zod";

export const SimpleRuleSchema = z.object({
  pattern: z.string(),
  traitId: z.string(),
  enumValueId: z.string(),
});

export type SimpleRule = z.infer<typeof SimpleRuleSchema>;

export const CompositeExtractionSchema = z.object({
  groupName: z.string(),
  traitId: z.string(),
  enumValueId: z.string(),
  rarity: z.string().optional(),
});

export type CompositeExtraction = z.infer<typeof CompositeExtractionSchema>;

export const CompositeRuleSchema = z.object({
  linePattern: z.string(),
  extractions: z.array(CompositeExtractionSchema),
});

export type CompositeRule = z.infer<typeof CompositeRuleSchema>;

export const MappingConfigSchema = z.object({
  speciesId: z.string(),
  communityId: z.string(),
  rarityOrder: z.array(z.string()),
  rarityPrefixes: z.array(z.string()),
  rarityToVariantId: z.record(z.string(), z.string()),
  rules: z.array(SimpleRuleSchema),
  compositeRules: z.array(CompositeRuleSchema).default([]),
  ignorePatterns: z.array(z.string()).default([]),
});

export type MappingConfig = z.infer<typeof MappingConfigSchema>;
