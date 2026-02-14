import { z } from "zod";

export const EnumMappedTraitSchema = z.object({
  traitId: z.string(),
  enumValueId: z.string(),
  rarity: z.string().optional(),
  sourceLine: z.string(),
});

export const TextMappedTraitSchema = z.object({
  traitId: z.string(),
  textValue: z.string(),
  sourceLine: z.string(),
});

export const MappedTraitSchema = z.union([
  EnumMappedTraitSchema,
  TextMappedTraitSchema,
]);

export type MappedTrait = z.infer<typeof MappedTraitSchema>;

export const ParsedCharacterSchema = z.object({
  numericId: z.string(),
  name: z.string(),
  registryId: z.string(),
  ownerDaUsername: z.string(),
  firstArtist: z.string(),
  firstDesigner: z.string(),
  category: z.string(),
  folderName: z.string(),
  url: z.string(),
  mappedTraits: z.array(MappedTraitSchema),
  unmappedLines: z.array(z.string()),
  warnings: z.array(z.string()),
  derivedVariantId: z.string().nullable(),
  derivedRarity: z.string().nullable(),
});

export type ParsedCharacter = z.infer<typeof ParsedCharacterSchema>;
