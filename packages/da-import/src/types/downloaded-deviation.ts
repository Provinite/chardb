import { z } from "zod";

export const DownloadedDeviationSchema = z.object({
  numericId: z.string(),
  deviationId: z.string(),
  url: z.string(),
  title: z.string(),
  authorUsername: z.string(),
  descriptionHtml: z.string(),
  folderName: z.string(),
  publishedTime: z.string(),
  thumbnailUrl: z.string().optional(),
});

export type DownloadedDeviation = z.infer<typeof DownloadedDeviationSchema>;

export const DownloadStateSchema = z.object({
  folders: z.record(
    z.string(),
    z.object({
      folderId: z.string(),
      offset: z.number(),
      complete: z.boolean(),
    })
  ),
  lastUpdated: z.string(),
});

export type DownloadState = z.infer<typeof DownloadStateSchema>;
