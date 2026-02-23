import { z } from "zod";

export const ImportStatusSchema = z.enum([
  "created",
  "registry_updated",
  "skipped_existing",
  "skipped_unmapped",
  "failed",
]);

export type ImportStatus = z.infer<typeof ImportStatusSchema>;

export const ImageUploadStatusSchema = z.enum([
  "uploaded",
  "skipped",
  "failed",
  "no_image",
]);

export type ImageUploadStatus = z.infer<typeof ImageUploadStatusSchema>;

export const ImportResultEntrySchema = z.object({
  numericId: z.string(),
  name: z.string(),
  status: ImportStatusSchema,
  characterId: z.string().optional(),
  error: z.string().optional(),
  imageStatus: ImageUploadStatusSchema.optional(),
  imageError: z.string().optional(),
});

export type ImportResultEntry = z.infer<typeof ImportResultEntrySchema>;

export const ImportResultsSchema = z.object({
  timestamp: z.string(),
  speciesId: z.string(),
  totalProcessed: z.number(),
  created: z.number(),
  registryUpdated: z.number().default(0),
  skippedExisting: z.number(),
  skippedUnmapped: z.number(),
  failed: z.number(),
  entries: z.array(ImportResultEntrySchema),
});

export type ImportResults = z.infer<typeof ImportResultsSchema>;
