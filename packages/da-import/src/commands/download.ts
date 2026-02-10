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

export const downloadCommand: CommandModule<object, DownloadArgs> = {
  command: "download",
  describe: "Download deviations from DeviantArt gallery folders",
  builder: {
    username: {
      type: "string" as const,
      demandOption: true,
      describe: "DeviantArt username to download from",
    },
    folders: {
      type: "string" as const,
      demandOption: true,
      describe: "Comma-separated list of folder names to download",
    },
    "client-id": {
      type: "string" as const,
      default: process.env.DEVIANTART_CLIENT_ID ?? "",
      describe: "DeviantArt OAuth client ID",
    },
    "client-secret": {
      type: "string" as const,
      default: process.env.DEVIANTART_CLIENT_SECRET ?? "",
      describe: "DeviantArt OAuth client secret",
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
  },
  handler: async (argv) => {
    const {
      username,
      folders: foldersArg,
      clientId,
      clientSecret,
      resume,
      rateLimit,
    } = argv;

    if (!clientId || !clientSecret) {
      logger.error(
        "DeviantArt credentials required. Set DEVIANTART_CLIENT_ID and DEVIANTART_CLIENT_SECRET env vars, or use --client-id and --client-secret flags."
      );
      process.exit(1);
    }

    const targetFolders = foldersArg.split(",").map((f) => f.trim());
    const deviationsDir = getDeviationsDir();
    const stateFile = path.join(getDataDir(), "download-state.json");

    await ensureDir(deviationsDir);

    const client = new DeviantArtClient(clientId, clientSecret, rateLimit);

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

          // Fetch description HTML
          let descriptionHtml = "";
          try {
            const content = await client.getDeviationContent(
              deviation.deviationid
            );
            descriptionHtml = content.html;
          } catch (err) {
            logger.warn(
              `Failed to fetch content for ${deviation.deviationid}: ${err}`
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
        }

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
    }

    logger.info("Download complete.");
  },
};
