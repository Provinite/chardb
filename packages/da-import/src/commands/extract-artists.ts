import * as path from "path";
import type { CommandModule } from "yargs";
import { z } from "zod";
import { ImageManifestSchema } from "../types/image-manifest";
import type { ImageDownload } from "../types/image-manifest";
import { ParsedCharacterSchema } from "../types/parsed-character";
import {
  getDataDir,
  getImageManifestPath,
  readJson,
  writeJson,
  fileExists,
} from "../utils/file-io";
import { extractArtistFromTitle } from "../utils/extract-artist";
import { logger } from "../utils/logger";

/**
 * Manual overrides for currentRef entries where the title format
 * doesn't match standard extraction patterns.
 * Key: numericId, Value: DA username.
 */
const CURRENT_REF_ARTIST_OVERRIDES: Record<string, string> = {
  "562921847": "Clovercoin",
  "642099136": "Nihao-Huli",
  "657319825": "OMGproductions",
  "666886886": "Trash-Gaylie",
  "668044905": "Clovercoin",
  "669449030": "Luckydiime",
  "669503286": "CinnriStreusel",
  "678461369": "CinnriStreusel",
  "724079744": "EmmyGoatArt",
  "730825790": "Pixelatedmas",
  "763873883": "Clovercoin",
  "764141800": "Purplefoxkinz",
  "769290011": "Clovercoin",
  "778501380": "Clovercoin",
  "829286801": "Clovercoin",
  "831584108": "Clovercoin",
  "859782123": "FlamingTea",
  "910876866": "fishyyllama",
};

interface ExtractArtistsArgs {
  dryRun: boolean;
}

export const extractArtistsCommand: CommandModule<object, ExtractArtistsArgs> = {
  command: "extract-artists",
  describe:
    "Extract artist DA usernames from oEmbed titles in the image manifest",
  builder: {
    "dry-run": {
      type: "boolean" as const,
      default: false,
      describe: "Print results without writing to manifest",
    },
  },
  handler: async (argv) => {
    const { dryRun } = argv;

    const manifestPath = getImageManifestPath();
    if (!(await fileExists(manifestPath))) {
      logger.error(
        "Image manifest not found. Run download-images first."
      );
      process.exit(1);
    }

    const manifest = await readJson(manifestPath, ImageManifestSchema);
    const entries = Object.values(manifest.entries);

    // Load parsed characters for firstArtist data
    const parsedPath = path.join(getDataDir(), "parsed-characters.json");
    const parsedChars = (await fileExists(parsedPath))
      ? await readJson(parsedPath, z.array(ParsedCharacterSchema))
      : [];
    const firstArtistByNumericId = new Map(
      parsedChars
        .filter((c) => c.firstArtist)
        .map((c) => [c.numericId, c.firstArtist])
    );
    logger.info(`Loaded ${firstArtistByNumericId.size} firstArtist entries from parsed characters`);

    const noMatchTitles: Array<{ numericId: string; field: string; title: string }> = [];

    function processDownload(
      download: ImageDownload,
      numericId: string,
      field: string,
      overrides: Record<string, string>,
      counters: { extracted: number; overridden: number; noTitle: number; noMatch: number }
    ): void {
      const override = overrides[numericId];
      if (override) {
        download.artistDaUsername = override;
        counters.overridden++;
        return;
      }

      if (!download.title) {
        counters.noTitle++;
        return;
      }

      const artist = extractArtistFromTitle(download.title);
      if (artist) {
        download.artistDaUsername = artist;
        counters.extracted++;
      } else {
        noMatchTitles.push({ numericId, field, title: download.title });
        counters.noMatch++;
      }
    }

    let origFromParsed = 0;
    let origMissing = 0;
    const refCounters = { extracted: 0, overridden: 0, noTitle: 0, noMatch: 0 };

    for (const entry of entries) {
      // Original: use firstArtist from parsed character data
      const firstArtist = firstArtistByNumericId.get(entry.numericId);
      if (firstArtist) {
        entry.original.artistDaUsername = firstArtist;
        origFromParsed++;
      } else {
        origMissing++;
      }

      // Current ref: extract from oEmbed title or use override
      processDownload(entry.currentRef, entry.numericId, "currentRef", CURRENT_REF_ARTIST_OVERRIDES, refCounters);
    }

    logger.info(`\nOriginal images:`);
    logger.info(`  From parsed firstArtist: ${origFromParsed}`);
    logger.info(`  No firstArtist: ${origMissing}`);
    logger.info(`\nCurrent ref images:`);
    logger.info(`  Artist extracted: ${refCounters.extracted}`);
    logger.info(`  Manual overrides: ${refCounters.overridden}`);
    logger.info(`  No title: ${refCounters.noTitle}`);
    logger.info(`  Title but no match: ${refCounters.noMatch}`);

    if (noMatchTitles.length > 0) {
      logger.info(`\nTitles that could not be parsed (${noMatchTitles.length}):`);
      for (const { numericId, field, title } of noMatchTitles) {
        logger.info(`  ${numericId} ${field}: ${title}`);
      }
    }

    if (!dryRun) {
      manifest.lastUpdated = new Date().toISOString();
      await writeJson(manifestPath, manifest);
      logger.info(`\nManifest updated: ${manifestPath}`);
    } else {
      logger.info(`\n=== DRY RUN — manifest not modified ===`);
    }
  },
};
