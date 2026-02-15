import { z } from "zod";

export const ImportStatusSchema = z.enum([
  "created",
  "skipped_existing",
  "skipped_unmapped",
  "failed",
]);

export type ImportStatus = z.infer<typeof ImportStatusSchema>;

export const ImportResultEntrySchema = z.object({
  numericId: z.string(),
  name: z.string(),
  status: ImportStatusSchema,
  characterId: z.string().optional(),
  error: z.string().optional(),
});

export type ImportResultEntry = z.infer<typeof ImportResultEntrySchema>;

export const ImportResultsSchema = z.object({
  timestamp: z.string(),
  speciesId: z.string(),
  totalProcessed: z.number(),
  created: z.number(),
  skippedExisting: z.number(),
  skippedUnmapped: z.number(),
  failed: z.number(),
  entries: z.array(ImportResultEntrySchema),
});

export type ImportResults = z.infer<typeof ImportResultsSchema>;
