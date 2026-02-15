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

export const ExactLineMappingSchema = z.object({
  traitId: z.string(),
  enumValueId: z.string(),
  rarity: z.string().optional(),
});

export type ExactLineMapping = z.infer<typeof ExactLineMappingSchema>;

export const ExactLineRuleSchema = z.object({
  line: z.string(),
  mappings: z.array(ExactLineMappingSchema),
});

export type ExactLineRule = z.infer<typeof ExactLineRuleSchema>;

export const TextValueTraitSchema = z.object({
  traitId: z.string(),
  source: z.enum(["deviationUrl"]),
});

export type TextValueTrait = z.infer<typeof TextValueTraitSchema>;

export const CategoryBadgesSchema = z.object({
  traitId: z.string(),
  mappings: z.record(z.string(), z.string()),
  retiredBadgeEnumId: z.string().optional(),
  retiredPatterns: z.array(z.string()).optional(),
  voidedBadgeEnumId: z.string().optional(),
  voidedPatterns: z.array(z.string()).optional(),
});

export type CategoryBadges = z.infer<typeof CategoryBadgesSchema>;

export const DescriptionBadgeSchema = z.object({
  pattern: z.string(),
  traitId: z.string(),
  enumValueId: z.string(),
});

export type DescriptionBadge = z.infer<typeof DescriptionBadgeSchema>;

export const DeviationOverrideSchema = z.object({
  numericId: z.string(),
  traits: z.array(z.object({
    traitId: z.string(),
    enumValueId: z.string(),
    rarity: z.string().optional(),
  })),
});

export type DeviationOverride = z.infer<typeof DeviationOverrideSchema>;

export const MappingConfigSchema = z.object({
  speciesId: z.string(),
  communityId: z.string(),
  rarityOrder: z.array(z.string()),
  rarityPrefixes: z.array(z.string()),
  rarityToVariantId: z.record(z.string(), z.string()),
  rules: z.array(SimpleRuleSchema),
  compositeRules: z.array(CompositeRuleSchema).default([]),
  ignorePatterns: z.array(z.string()).default([]),
  exactLineRules: z.array(ExactLineRuleSchema).default([]),
  textValueTraits: z.array(TextValueTraitSchema).default([]),
  categoryBadges: CategoryBadgesSchema.optional(),
  deviationOverrides: z.array(DeviationOverrideSchema).default([]),
  descriptionBadges: z.array(DescriptionBadgeSchema).default([]),
});

export type MappingConfig = z.infer<typeof MappingConfigSchema>;
