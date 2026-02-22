import { z } from "zod";

export const ImageDownloadStatusSchema = z.enum([
  "downloaded",
  "failed",
  "skipped",
]);

export type ImageDownloadStatus = z.infer<typeof ImageDownloadStatusSchema>;

export const ImageDownloadSchema = z.object({
  sourceUrl: z.string(),
  resolvedUrl: z.string(),
  localPath: z.string(),
  status: ImageDownloadStatusSchema,
  error: z.string().optional(),
  title: z.string().optional(),
});

export type ImageDownload = z.infer<typeof ImageDownloadSchema>;

export const ImageEntrySchema = z.object({
  numericId: z.string(),
  name: z.string(),
  original: ImageDownloadSchema,
  currentRef: ImageDownloadSchema,
});

export type ImageEntry = z.infer<typeof ImageEntrySchema>;

export const ImageManifestSchema = z.object({
  lastUpdated: z.string(),
  entries: z.record(z.string(), ImageEntrySchema),
});

export type ImageManifest = z.infer<typeof ImageManifestSchema>;
