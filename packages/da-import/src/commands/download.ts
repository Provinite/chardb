import * as path from "path";
import type { CommandModule } from "yargs";
import { DeviantArtClient } from "../da-api/client";
import type { DownloadedDeviation, DownloadState } from "../types/downloaded-deviation";
import { DownloadStateSchema } from "../types/downloaded-deviation";
import {
  getDataDir,
  getDeviationsDir,
  ensureDir,
  writeJson,
  readJson,
  fileExists,
} from "../utils/file-io";
import { logger } from "../utils/logger";

interface DownloadArgs {
  username: string;
  folders: string;
  clientId: string;
  clientSecret: string;
  resume: boolean;
  rateLimit: number;
  url: string | undefined;
  limit: number;
}

function extractNumericId(url: string): string | null {
  const match = url.match(/(\d{6,})$/);
  return match ? match[1] : null;
}

async function loadState(stateFile: string): Promise<DownloadState | null> {
  if (await fileExists(stateFile)) {
    return readJson(stateFile, DownloadStateSchema);
  }
  return null;
}

async function downloadSingleDeviation(
  client: DeviantArtClient,
  deviationUrl: string,
  deviationsDir: string
): Promise<void> {
  const numericId = extractNumericId(deviationUrl);
  if (!numericId) {
    logger.error(`Could not extract numeric ID from URL: ${deviationUrl}`);
    process.exit(1);
  }

  logger.info(`Fetching deviation ${numericId}...`);

  // Scrape page for UUID and description in one request
  const { uuid, descriptionHtml } = await client.scrapeDeviationPage(deviationUrl);

  // Fetch full deviation metadata via the API
  const deviation = await client.getDeviation(uuid);

  const downloaded: DownloadedDeviation = {
    numericId,
    deviationId: deviation.deviationid,
    url: deviation.url,
    title: deviation.title,
    authorUsername: deviation.author.username,
    descriptionHtml,
    folderName: "(single)",
    publishedTime: deviation.published_time,
    thumbnailUrl: deviation.thumbs?.[0]?.src,
  };

  const outPath = path.join(deviationsDir, `${numericId}.json`);
  await writeJson(outPath, downloaded);

  logger.info(`Saved: ${outPath}`);
  logger.info(`  Title: ${downloaded.title}`);
  logger.info(`  Author: ${downloaded.authorUsername}`);
  logger.info(`  Description length: ${descriptionHtml.length} chars`);
}

export const downloadCommand: CommandModule<object, DownloadArgs> = {
  command: "download",
  describe: "Download deviations from DeviantArt gallery folders",
  builder: {
    username: {
      type: "string" as const,
      default: "",
      describe: "DeviantArt username to download from",
    },
    folders: {
      type: "string" as const,
      default: "",
      describe: "Comma-separated list of folder names to download",
    },
    url: {
      type: "string" as const,
      describe: "Download a single deviation by URL",
    },
    "client-id": {
      type: "string" as const,
      describe: "DeviantArt OAuth client ID (or set DEVIANTART_CLIENT_ID env var)",
    },
    "client-secret": {
      type: "string" as const,
      describe: "DeviantArt OAuth client secret (or set DEVIANTART_CLIENT_SECRET env var)",
    },
    resume: {
      type: "boolean" as const,
      default: false,
      describe: "Resume from last saved download state",
    },
    "rate-limit": {
      type: "number" as const,
      default: 1000,
      describe: "Minimum milliseconds between API calls",
    },
    limit: {
      type: "number" as const,
      default: 0,
      describe: "Max deviations to download (0 = unlimited)",
    },
  },
  handler: async (argv) => {
    const {
      username,
      folders: foldersArg,
      clientId: clientIdArg,
      clientSecret: clientSecretArg,
      resume,
      rateLimit,
      url: singleUrl,
      limit,
    } = argv;

    const clientId = clientIdArg || process.env.DEVIANTART_CLIENT_ID || "";
    const clientSecret = clientSecretArg || process.env.DEVIANTART_CLIENT_SECRET || "";

    if (!clientId || !clientSecret) {
      logger.error(
        "DeviantArt credentials required. Set DEVIANTART_CLIENT_ID and DEVIANTART_CLIENT_SECRET env vars, or use --client-id and --client-secret flags."
      );
      process.exit(1);
    }

    const deviationsDir = getDeviationsDir();
    await ensureDir(deviationsDir);
    const client = new DeviantArtClient(clientId, clientSecret, rateLimit);

    // Single deviation mode
    if (singleUrl) {
      await downloadSingleDeviation(client, singleUrl, deviationsDir);
      return;
    }

    // Folder mode — require username and folders
    if (!username || !foldersArg) {
      logger.error("Either --url or both --username and --folders are required.");
      process.exit(1);
    }

    const targetFolders = foldersArg.split(",").map((f) => f.trim());
    const stateFile = path.join(getDataDir(), "download-state.json");

    // Load or initialize state
    let state: DownloadState = resume
      ? (await loadState(stateFile)) ?? {
          folders: {},
          lastUpdated: new Date().toISOString(),
        }
      : { folders: {}, lastUpdated: new Date().toISOString() };

    // Get folder listing
    logger.info(`Fetching gallery folders for ${username}...`);
    const foldersResp = await client.getGalleryFolders(username);
    const folderMap = new Map(
      foldersResp.results.map((f) => [f.name, f])
    );

    let totalDownloaded = 0;

    for (const folderName of targetFolders) {
      const folder = folderMap.get(folderName);
      if (!folder) {
        logger.warn(
          `Folder "${folderName}" not found. Available: ${foldersResp.results.map((f) => f.name).join(", ")}`
        );
        continue;
      }

      // Check if already complete
      const folderState = state.folders[folderName];
      if (folderState?.complete) {
        logger.info(`Folder "${folderName}" already complete, skipping.`);
        continue;
      }

      const startOffset = folderState?.offset ?? 0;
      logger.info(
        `Downloading folder "${folderName}" (${folder.size} items, starting at offset ${startOffset})...`
      );

      let offset = startOffset;
      let downloadedCount = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const page = await client.getGalleryFolder(
          folder.folderid,
          username,
          offset
        );

        for (const deviation of page.results) {
          const numericId = extractNumericId(deviation.url);
          if (!numericId) {
            logger.warn(
              `Could not extract numeric ID from URL: ${deviation.url}`
            );
            continue;
          }

          // Fetch description HTML by scraping the deviation page
          let descriptionHtml = "";
          try {
            descriptionHtml = await client.getDeviationDescription(
              deviation.url
            );
          } catch (err) {
            logger.warn(
              `Failed to fetch description for ${deviation.deviationid}: ${err}`
            );
          }

          const downloaded: DownloadedDeviation = {
            numericId,
            deviationId: deviation.deviationid,
            url: deviation.url,
            title: deviation.title,
            authorUsername: deviation.author.username,
            descriptionHtml,
            folderName,
            publishedTime: deviation.published_time,
            thumbnailUrl: deviation.thumbs?.[0]?.src,
          };

          const outPath = path.join(deviationsDir, `${numericId}.json`);
          await writeJson(outPath, downloaded);
          downloadedCount++;
          totalDownloaded++;

          if (limit > 0 && totalDownloaded >= limit) break;
        }

        if (limit > 0 && totalDownloaded >= limit) break;

        offset += page.results.length;

        // Save state after each page
        state.folders[folderName] = {
          folderId: folder.folderid,
          offset,
          complete: !page.has_more,
        };
        state.lastUpdated = new Date().toISOString();
        await writeJson(stateFile, state);

        logger.info(
          `  ${folderName}: ${offset}/${folder.size} deviations processed`
        );

        if (!page.has_more) break;
      }

      logger.info(
        `Completed folder "${folderName}": ${downloadedCount} new deviations saved.`
      );

      if (limit > 0 && totalDownloaded >= limit) {
        logger.info(`Reached limit of ${limit} deviations.`);
        break;
      }
    }

    logger.info("Download complete.");
  },
};
