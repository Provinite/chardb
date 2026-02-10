import { z } from "zod";

export const MappedTraitSchema = z.object({
  traitId: z.string(),
  enumValueId: z.string(),
  rarity: z.string().optional(),
  sourceLine: z.string(),
});

export type MappedTrait = z.infer<typeof MappedTraitSchema>;

export const ParsedCharacterSchema = z.object({
  numericId: z.string(),
  name: z.string(),
  ownerDaUsername: z.string(),
  folderName: z.string(),
  url: z.string(),
  mappedTraits: z.array(MappedTraitSchema),
  unmappedLines: z.array(z.string()),
  warnings: z.array(z.string()),
  derivedVariantId: z.string().nullable(),
  derivedRarity: z.string().nullable(),
});

export type ParsedCharacter = z.infer<typeof ParsedCharacterSchema>;
