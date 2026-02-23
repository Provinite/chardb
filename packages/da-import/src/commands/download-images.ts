import * as fs from "fs/promises";
import * as path from "path";
import type { CommandModule } from "yargs";
import { z } from "zod";
import { RateLimiter } from "../da-api/rate-limiter";
import { ParsedCharacterSchema } from "../types/parsed-character";
import type { ImageManifest, ImageDownload } from "../types/image-manifest";
import { ImageManifestSchema } from "../types/image-manifest";
import {
  getDataDir,
  getImagesDir,
  getImageManifestPath,
  ensureDir,
  writeJson,
  readJson,
  fileExists,
} from "../utils/file-io";
import { logger } from "../utils/logger";
import { ProgressTracker } from "../utils/progress";

const DA_OEMBED_URL = "https://backend.deviantart.com/oembed";

interface DownloadImagesArgs {
  rateLimit: number;
  force: boolean;
  reprocessExisting: boolean;
  limit: number;
  metadataOnly: boolean;
}

interface OEmbedResponse {
  url: string;
  type: string;
  title: string;
  width: number | string;
  height: number | string;
  imagetype?: string;
}

function getExtensionFromUrl(url: string): string {
  try {
    const urlPath = new URL(url).pathname;
    const ext = path.extname(urlPath).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      return ext;
    }
  } catch {
    // ignore invalid URLs
  }
  return ".png";
}

async function fetchOEmbed(
  pageUrl: string,
  rateLimiter: RateLimiter
): Promise<OEmbedResponse> {
  await rateLimiter.wait();

  const oembedUrl = `${DA_OEMBED_URL}?url=${encodeURIComponent(pageUrl)}`;
  const resp = await fetch(oembedUrl, {
    headers: { "User-Agent": "CharDB-Import/1.0" },
  });

  if (!resp.ok) {
    throw new Error(`oEmbed request failed: ${resp.status}`);
  }

  return (await resp.json()) as OEmbedResponse;
}

function extractOEmbedMetadata(data: OEmbedResponse): {
  imageUrl: string;
  extension: string;
  title: string;
} {
  if (!data.url) {
    throw new Error("oEmbed response missing image URL");
  }

  const extension =
    data.imagetype && data.imagetype.length > 0
      ? `.${data.imagetype}`
      : getExtensionFromUrl(data.url);

  return { imageUrl: data.url, extension, title: data.title || "" };
}

async function downloadFile(
  url: string,
  destPath: string,
  rateLimiter: RateLimiter
): Promise<void> {
  await rateLimiter.wait();

  const resp = await fetch(url, {
    headers: { "User-Agent": "CharDB-Import/1.0" },
  });

  if (!resp.ok) {
    throw new Error(`Download failed: ${resp.status}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

async function loadOrInitManifest(
  manifestPath: string
): Promise<ImageManifest> {
  if (await fileExists(manifestPath)) {
    try {
      return await readJson(manifestPath, ImageManifestSchema);
    } catch (err) {
      logger.warn(`Could not parse existing manifest, starting fresh: ${err}`);
    }
  }
  return {
    lastUpdated: new Date().toISOString(),
    entries: {},
  };
}

function makeSkippedDownload(sourceUrl: string): ImageDownload {
  return {
    sourceUrl,
    resolvedUrl: "",
    localPath: "",
    status: "skipped",
  };
}

function makeFailedDownload(
  sourceUrl: string,
  error: string
): ImageDownload {
  return {
    sourceUrl,
    resolvedUrl: "",
    localPath: "",
    status: "failed",
    error,
  };
}

/**
 * Fetch oEmbed and optionally download the image.
 * With metadataOnly, merges title into existing entry without downloading.
 */
async function processImage(
  sourceUrl: string,
  fileName: string,
  existing: ImageDownload | undefined,
  imagesDir: string,
  rateLimiter: RateLimiter,
  metadataOnly: boolean
): Promise<ImageDownload> {
  const data = await fetchOEmbed(sourceUrl, rateLimiter);
  const { imageUrl, extension, title } = extractOEmbedMetadata(data);

  if (metadataOnly) {
    if (existing && existing.status === "downloaded") {
      return { ...existing, title: title || existing.title };
    }
    return {
      sourceUrl,
      resolvedUrl: imageUrl,
      localPath: "",
      status: "skipped",
      title: title || undefined,
    };
  }

  const fullFileName = `${fileName}${extension}`;
  const destPath = path.join(imagesDir, fullFileName);
  await downloadFile(imageUrl, destPath, rateLimiter);

  return {
    sourceUrl,
    resolvedUrl: imageUrl,
    localPath: fullFileName,
    status: "downloaded",
    title: title || undefined,
  };
}

/**
 * Check if a download entry is already complete and file exists on disk.
 */
async function isAlreadyDownloaded(
  download: ImageDownload | undefined,
  imagesDir: string
): Promise<boolean> {
  if (!download || download.status !== "downloaded" || !download.localPath) {
    return false;
  }
  return fileExists(path.join(imagesDir, download.localPath));
}

export const downloadImagesCommand: CommandModule<object, DownloadImagesArgs> = {
  command: "download-images",
  describe:
    "Download original and current reference images for parsed characters",
  builder: {
    "rate-limit": {
      type: "number" as const,
      default: 2000,
      describe: "Minimum milliseconds between oEmbed requests",
    },
    force: {
      type: "boolean" as const,
      default: false,
      describe: "Re-download images even if already on disk",
    },
    "reprocess-existing": {
      type: "boolean" as const,
      default: false,
      describe: "Re-fetch oEmbed for entries already in the manifest",
    },
    limit: {
      type: "number" as const,
      default: 0,
      describe: "Max characters to process (0 = unlimited)",
    },
    "metadata-only": {
      type: "boolean" as const,
      default: false,
      describe: "Only fetch oEmbed metadata, skip image downloads",
    },
  },
  handler: async (argv) => {
    const { rateLimit, force, reprocessExisting, limit, metadataOnly } = argv;

    // Load parsed characters
    const parsedPath = path.join(getDataDir(), "parsed-characters.json");
    if (!(await fileExists(parsedPath))) {
      logger.error(
        "parsed-characters.json not found. Run the parse command first."
      );
      process.exit(1);
    }

    const characters = await readJson(
      parsedPath,
      z.array(ParsedCharacterSchema)
    );

    // Every character has a deviation URL (original ref).
    // Only some have a currentRefUrl (sta.sh link for updated ref).
    const charsWithAnyImage = characters.filter(
      (c) => c.url !== "" || c.currentRefUrl !== ""
    );
    const toProcess =
      limit > 0 ? charsWithAnyImage.slice(0, limit) : charsWithAnyImage;

    const withOriginal = characters.filter((c) => c.url !== "").length;
    const withCurrentRef = characters.filter(
      (c) => c.currentRefUrl !== ""
    ).length;

    logger.info(
      `${characters.length} total characters: ${withOriginal} with deviation URL, ${withCurrentRef} with sta.sh ref URL`
    );
    if (limit > 0) {
      logger.info(`Processing first ${limit}`);
    }

    // Set up output directory
    const imagesDir = getImagesDir();
    await ensureDir(imagesDir);

    // Load or initialize manifest
    const manifestPath = getImageManifestPath();
    const manifest = await loadOrInitManifest(manifestPath);

    const rateLimiter = new RateLimiter(rateLimit, rateLimit + 250);
    const SAVE_INTERVAL = 10;

    const label = metadataOnly ? "Fetching metadata" : "Downloading";
    const progress = new ProgressTracker(toProcess.length, label);
    let origProcessed = 0;
    let origSkipped = 0;
    let origFailed = 0;
    let refProcessed = 0;
    let refSkipped = 0;
    let refFailed = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const char = toProcess[i];
      const existing = manifest.entries[char.numericId];

      // --- Original deviation image ---
      let original: ImageDownload;
      if (!char.url) {
        original = makeSkippedDownload("");
        origSkipped++;
      } else if (
        !force &&
        !reprocessExisting &&
        (await isAlreadyDownloaded(existing?.original, imagesDir))
      ) {
        original = existing!.original;
        origSkipped++;
      } else {
        try {
          original = await processImage(
            char.url,
            `${char.numericId}-original`,
            existing?.original,
            imagesDir,
            rateLimiter,
            metadataOnly
          );
          origProcessed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`Original failed: ${char.name} (${char.numericId}): ${msg}`);
          original = existing?.original ?? makeFailedDownload(char.url, msg);
          origFailed++;
        }
      }

      // --- Current ref image (sta.sh) ---
      let currentRef: ImageDownload;
      if (!char.currentRefUrl) {
        currentRef = makeSkippedDownload("");
        refSkipped++;
      } else if (
        !force &&
        !reprocessExisting &&
        (await isAlreadyDownloaded(existing?.currentRef, imagesDir))
      ) {
        currentRef = existing!.currentRef;
        refSkipped++;
      } else {
        try {
          currentRef = await processImage(
            char.currentRefUrl,
            `${char.numericId}-ref`,
            existing?.currentRef,
            imagesDir,
            rateLimiter,
            metadataOnly
          );
          refProcessed++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn(`Ref failed: ${char.name} (${char.numericId}): ${msg}`);
          currentRef = existing?.currentRef ?? makeFailedDownload(char.currentRefUrl, msg);
          refFailed++;
        }
      }

      manifest.entries[char.numericId] = {
        numericId: char.numericId,
        name: char.name,
        original,
        currentRef,
      };

      progress.increment();

      // Periodic manifest save
      if ((i + 1) % SAVE_INTERVAL === 0) {
        manifest.lastUpdated = new Date().toISOString();
        await writeJson(manifestPath, manifest);
      }
    }

    progress.finish();

    // Final manifest save
    manifest.lastUpdated = new Date().toISOString();
    await writeJson(manifestPath, manifest);

    const action = metadataOnly ? "updated" : "downloaded";
    logger.info(
      `Original: ${origProcessed} ${action}, ${origSkipped} skipped, ${origFailed} failed`
    );
    logger.info(
      `Current ref: ${refProcessed} ${action}, ${refSkipped} skipped, ${refFailed} failed`
    );
    logger.info(`Manifest saved: ${manifestPath}`);
  },
};
