import * as path from "path";
import * as readline from "readline";
import type { CommandModule } from "yargs";
import { CharDBClient } from "../graphql/client";
import type {
  ImportResultEntry,
  ImportResults,
  ImageUploadStatus,
} from "../types/import-result";
import type { ImageManifest } from "../types/image-manifest";
import { ImageManifestSchema } from "../types/image-manifest";
import { MappingConfigSchema } from "../types/mapping-config";
import { ParsedCharacterSchema } from "../types/parsed-character";
import {
  getDataDir,
  getConfigDir,
  getImagesDir,
  getImageManifestPath,
  readJson,
  writeJson,
  fileExists,
} from "../utils/file-io";
import { loadExclusions } from "./exclude";
import { logger } from "../utils/logger";
import { ProgressTracker } from "../utils/progress";
import { z } from "zod";

interface ImportArgs {
  apiUrl: string;
  email: string;
  password: string;
  mapping: string;
  dryRun: boolean;
  force: boolean;
  skipUnmapped: boolean;
  uploadImages: boolean;
  uploadImagesForExisting: boolean;
  limit: number;
}

async function promptConfirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

/**
 * Upload both original and current ref images for a character, then set main media.
 * Returns the imageStatus for the result entry.
 */
async function uploadCharacterImages(
  client: CharDBClient,
  characterId: string,
  numericId: string,
  manifest: ImageManifest,
  imagesDir: string
): Promise<{ imageStatus: ImageUploadStatus; imageError?: string }> {
  const entry = manifest.entries[numericId];
  if (!entry) {
    return { imageStatus: "no_image" };
  }

  const hasOriginal =
    entry.original.status === "downloaded" && entry.original.localPath;
  const hasCurrentRef =
    entry.currentRef.status === "downloaded" && entry.currentRef.localPath;

  if (!hasOriginal && !hasCurrentRef) {
    return { imageStatus: "no_image" };
  }

  let originalMediaId: string | undefined;
  let currentRefMediaId: string | undefined;

  // Upload original deviation image
  if (hasOriginal) {
    const filePath = path.join(imagesDir, entry.original.localPath);
    if (await fileExists(filePath)) {
      const artist = entry.original.artistDaUsername
        ? { name: entry.original.artistDaUsername, url: `https://www.deviantart.com/${entry.original.artistDaUsername}` }
        : undefined;
      const media = await client.uploadImage(
        filePath,
        characterId,
        `${entry.name} - Original`,
        artist
      );
      originalMediaId = media.id;
    }
  }

  // Upload current ref image
  if (hasCurrentRef) {
    const filePath = path.join(imagesDir, entry.currentRef.localPath);
    if (await fileExists(filePath)) {
      const artist = entry.currentRef.artistDaUsername
        ? { name: entry.currentRef.artistDaUsername, url: `https://www.deviantart.com/${entry.currentRef.artistDaUsername}` }
        : undefined;
      const media = await client.uploadImage(
        filePath,
        characterId,
        `${entry.name} - Reference`,
        artist
      );
      currentRefMediaId = media.id;
    }
  }

  // If nothing was actually uploaded, report accurately
  if (!originalMediaId && !currentRefMediaId) {
    return { imageStatus: "no_image" };
  }

  // Set main media: prefer current ref, fall back to original
  const mainMediaId = currentRefMediaId ?? originalMediaId;
  if (mainMediaId) {
    await client.setCharacterMainMedia(characterId, mainMediaId);
  }

  return { imageStatus: "uploaded" };
}

export const importCommand: CommandModule<object, ImportArgs> = {
  command: "import",
  describe: "Import parsed characters into CharDB",
  builder: {
    "api-url": {
      type: "string" as const,
      default: "http://localhost:4000/graphql",
      describe: "CharDB GraphQL API URL",
    },
    email: {
      type: "string" as const,
      describe: "Admin email for CharDB login (required unless --dry-run)",
    },
    password: {
      type: "string" as const,
      describe: "Admin password for CharDB login (required unless --dry-run)",
    },
    mapping: {
      type: "string" as const,
      default: path.join(getConfigDir(), "trait-mapping.json"),
      describe: "Path to trait mapping config file",
    },
    "dry-run": {
      type: "boolean" as const,
      default: false,
      describe: "Print what would be imported without calling API",
    },
    force: {
      type: "boolean" as const,
      default: false,
      describe: "Skip interactive review prompt",
    },
    "skip-unmapped": {
      type: "boolean" as const,
      default: true,
      describe: "Skip characters with unmapped traits",
    },
    "upload-images": {
      type: "boolean" as const,
      default: true,
      describe: "Upload reference images from manifest during import",
    },
    "upload-images-for-existing": {
      type: "boolean" as const,
      default: false,
      describe: "Upload images for existing characters that have no main media",
    },
    limit: {
      type: "number" as const,
      default: 0,
      describe: "Max characters to process (0 = unlimited)",
    },
  },
  handler: async (argv) => {
    const {
      apiUrl,
      email,
      password,
      mapping: mappingPath,
      dryRun,
      force,
      skipUnmapped,
      uploadImages,
      uploadImagesForExisting,
      limit,
    } = argv;

    // Load parsed characters
    const parsedPath = path.join(getDataDir(), "parsed-characters.json");
    logger.info("Loading parsed characters...");
    const allParsed = await readJson(parsedPath, z.array(ParsedCharacterSchema));

    // Filter out excluded deviations
    const exclusions = await loadExclusions();
    const excludedIds = new Set(exclusions.map((e) => e.numericId));
    const afterExclusions = allParsed.filter((c) => !excludedIds.has(c.numericId));
    if (excludedIds.size > 0) {
      logger.info(`  Excluded ${allParsed.length - afterExclusions.length} characters (${excludedIds.size} exclusion rules)`);
    }

    const parsed = limit > 0 ? afterExclusions.slice(0, limit) : afterExclusions;
    if (limit > 0) {
      logger.info(`  Limited to first ${limit} of ${afterExclusions.length} characters`);
    }

    // Load mapping config
    const config = await readJson(mappingPath, MappingConfigSchema);

    // Load image manifest (optional)
    let manifest: ImageManifest | undefined;
    const manifestPath = getImageManifestPath();
    if (uploadImages && (await fileExists(manifestPath))) {
      manifest = await readJson(manifestPath, ImageManifestSchema);
      const entryCount = Object.keys(manifest.entries).length;
      logger.info(`Loaded image manifest with ${entryCount} entries`);
    } else if (uploadImages) {
      logger.warn(
        "Image manifest not found — run download-images first to enable image uploads"
      );
    }

    const imagesDir = getImagesDir();

    // Pre-flight categorization
    const fullyMapped = parsed.filter((c) => c.unmappedLines.length === 0);
    const withUnmapped = parsed.filter((c) => c.unmappedLines.length > 0);
    const importable = skipUnmapped ? fullyMapped : parsed;

    logger.info(`\nImport summary:`);
    logger.info(`  Total parsed: ${parsed.length}`);
    logger.info(`  Fully mapped: ${fullyMapped.length}`);
    logger.info(`  With unmapped traits: ${withUnmapped.length}`);
    logger.info(
      `  To import: ${importable.length}${skipUnmapped ? " (skipping unmapped)" : ""}`
    );

    if (dryRun) {
      logger.info("\n=== DRY RUN — no writes will be made ===\n");
    } else if (!email || !password) {
      logger.error("--email and --password are required unless --dry-run is set");
      process.exit(1);
    }

    // Login (skip for dry run)
    const client = new CharDBClient(apiUrl);
    if (!dryRun) {
      await client.login(email, password);
    }

    // Build existing character index
    logger.info("Building existing character index...");
    const existingChars = await client.getAllCharactersForSpecies(
      config.speciesId
    );
    const existingByRegistryId = new Map(
      existingChars
        .filter((c) => c.registryId)
        .map((c) => [c.registryId!, c.id])
    );
    // Name-based index for characters missing a registryId — used to
    // set the registryId on existing characters without duplicating them.
    const existingWithoutRegistryByName = new Map(
      existingChars
        .filter((c) => !c.registryId)
        .map((c) => [c.name.trim().toLowerCase(), c.id])
    );
    logger.info(`  Found ${existingChars.length} existing characters (${existingByRegistryId.size} with registryId, ${existingWithoutRegistryByName.size} without)`);

    // Count how many would fall into each bucket
    const wouldSkipExisting = importable.filter((c) =>
      existingByRegistryId.has(c.registryId)
    ).length;
    const wouldUpdateRegistry = importable.filter(
      (c) =>
        !existingByRegistryId.has(c.registryId) &&
        existingWithoutRegistryByName.has(c.name.trim().toLowerCase())
    ).length;
    const wouldCreate = importable.length - wouldSkipExisting - wouldUpdateRegistry;

    logger.info(`  Would create: ${wouldCreate}`);
    logger.info(`  Would update registry only: ${wouldUpdateRegistry}`);
    logger.info(`  Would skip (existing): ${wouldSkipExisting}`);

    // Review prompt (skip for dry run)
    if (!dryRun && !force) {
      const proceed = await promptConfirm(
        `\nProceed with importing ${wouldCreate} new + ${wouldUpdateRegistry} registry updates?`
      );
      if (!proceed) {
        logger.info("Import cancelled.");
        return;
      }
    }

    // Import loop
    const resultsPath = path.join(getDataDir(), "import-results.json");
    const entries: ImportResultEntry[] = [];
    let created = 0;
    let registryUpdated = 0;
    let skippedExisting = 0;
    let skippedUnmapped = 0;
    let failed = 0;
    let imagesUploaded = 0;
    let imagesFailed = 0;

    const saveResults = async () => {
      const results: ImportResults = {
        timestamp: new Date().toISOString(),
        speciesId: config.speciesId,
        totalProcessed: entries.length,
        created,
        registryUpdated,
        skippedExisting,
        skippedUnmapped,
        failed,
        entries,
      };
      await writeJson(resultsPath, results);
    };

    const progress = new ProgressTracker(parsed.length, "Importing");

    for (const char of parsed) {
      // Skip unmapped if configured
      if (skipUnmapped && char.unmappedLines.length > 0) {
        entries.push({
          numericId: char.numericId,
          name: char.name,
          status: "skipped_unmapped",
        });
        skippedUnmapped++;
        progress.increment();
        await saveResults();
        continue;
      }

      // Skip existing
      if (existingByRegistryId.has(char.registryId)) {
        const existingId = existingByRegistryId.get(char.registryId)!;
        const entry: ImportResultEntry = {
          numericId: char.numericId,
          name: char.name,
          status: "skipped_existing",
          characterId: existingId,
        };

        // Optionally upload images for existing characters
        if (manifest && uploadImagesForExisting) {
          if (dryRun) {
            const imgEntry = manifest.entries[char.numericId];
            if (imgEntry) {
              const hasOrig = imgEntry.original.status === "downloaded" && imgEntry.original.localPath;
              const hasRef = imgEntry.currentRef.status === "downloaded" && imgEntry.currentRef.localPath;
              if (hasOrig) {
                logger.info(`[DRY RUN]   image (original) for existing ${existingId}: "${imgEntry.name} - Original", file: ${imgEntry.original.localPath}, artist: ${imgEntry.original.artistDaUsername ?? "(none)"}`);
              }
              if (hasRef) {
                logger.info(`[DRY RUN]   image (ref) for existing ${existingId}: "${imgEntry.name} - Reference", file: ${imgEntry.currentRef.localPath}, artist: ${imgEntry.currentRef.artistDaUsername ?? "(none)"}`);
              }
            }
          } else {
            try {
              const imgResult = await uploadCharacterImages(
                client,
                existingId,
                char.numericId,
                manifest,
                imagesDir
              );
              entry.imageStatus = imgResult.imageStatus;
              entry.imageError = imgResult.imageError;
              if (imgResult.imageStatus === "uploaded") imagesUploaded++;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              entry.imageStatus = "failed";
              entry.imageError = msg;
              imagesFailed++;
              logger.warn(`Image upload failed for existing ${char.numericId}: ${msg}`);
            }
          }
        }

        entries.push(entry);
        skippedExisting++;
        progress.increment();
        await saveResults();
        continue;
      }

      // Update registry ID for existing name match with no registryId
      const nameKey = char.name.trim().toLowerCase();
      const existingByNameId = existingWithoutRegistryByName.get(nameKey);
      if (existingByNameId) {
        if (dryRun) {
          logger.info(`[DRY RUN] updateCharacterRegistry(${existingByNameId}, { registryId: "${char.registryId}" }) — ${char.name}`);
        } else {
          try {
            await client.updateCharacterRegistry(existingByNameId, {
              registryId: char.registryId,
            });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            entries.push({
              numericId: char.numericId,
              name: char.name,
              status: "failed",
              error: `Registry update failed: ${errorMsg}`,
              characterId: existingByNameId,
            });
            failed++;
            logger.warn(`Failed to update registry for ${char.name}: ${errorMsg}`);
            progress.increment();
            await saveResults();
            continue;
          }
        }
        entries.push({
          numericId: char.numericId,
          name: char.name,
          status: "registry_updated",
          characterId: existingByNameId,
        });
        registryUpdated++;
        // Remove from name index so we don't match again
        existingWithoutRegistryByName.delete(nameKey);
        // Add to registryId index so subsequent duplicates get skipped
        existingByRegistryId.set(char.registryId, existingByNameId);
        progress.increment();
        await saveResults();
        continue;
      }

      // Create character
      const input = {
        name: char.name,
        registryId: char.registryId,
        speciesId: config.speciesId,
        speciesVariantId: char.derivedVariantId ?? config.rarityToVariantId[config.rarityOrder[0]],
        traitValues: char.mappedTraits.map((t) => ({
          traitId: t.traitId,
          value: "enumValueId" in t ? t.enumValueId : t.textValue,
        })),
        pendingOwner: char.ownerDaUsername
          ? {
              provider: "DEVIANTART",
              providerAccountId: char.ownerDaUsername,
            }
          : undefined,
        assignToSelf: false,
        visibility: "PUBLIC",
        traitReviewSource: "IMPORT",
      };

      if (dryRun) {
        logger.info(`[DRY RUN] createCharacter("${char.name}")`);
        logger.info(`[DRY RUN]   registryId: "${char.registryId}"`);
        logger.info(`[DRY RUN]   variant: ${char.derivedVariantId ?? "default"} (${char.derivedRarity ?? "unknown rarity"})`);
        if (char.ownerDaUsername) {
          logger.info(`[DRY RUN]   pendingOwner: { provider: "DEVIANTART", providerAccountId: "${char.ownerDaUsername}" }`);
        } else {
          logger.info(`[DRY RUN]   pendingOwner: (none)`);
        }
        logger.info(`[DRY RUN]   traits (${char.mappedTraits.length}):`);
        for (const t of char.mappedTraits) {
          if ("enumValueId" in t) {
            logger.info(`[DRY RUN]     ${t.sourceLine} -> traitId: ${t.traitId}, enumValueId: ${t.enumValueId}`);
          } else {
            logger.info(`[DRY RUN]     ${t.sourceLine} -> traitId: ${t.traitId}, text: "${t.textValue}"`);
          }
        }
        if (manifest && uploadImages) {
          const imgEntry = manifest.entries[char.numericId];
          if (imgEntry) {
            const hasOrig = imgEntry.original.status === "downloaded" && imgEntry.original.localPath;
            const hasRef = imgEntry.currentRef.status === "downloaded" && imgEntry.currentRef.localPath;
            if (hasOrig) {
              logger.info(`[DRY RUN]   image (original): "${imgEntry.name} - Original", file: ${imgEntry.original.localPath}, artist: ${imgEntry.original.artistDaUsername ?? "(none)"}`);
            }
            if (hasRef) {
              logger.info(`[DRY RUN]   image (ref): "${imgEntry.name} - Reference", file: ${imgEntry.currentRef.localPath}, artist: ${imgEntry.currentRef.artistDaUsername ?? "(none)"}`);
            }
            if (!hasOrig && !hasRef) {
              logger.info(`[DRY RUN]   images: none available`);
            }
          } else {
            logger.info(`[DRY RUN]   images: no manifest entry`);
          }
        }
        entries.push({
          numericId: char.numericId,
          name: char.name,
          status: "created",
        });
        created++;
      } else {
        try {
          const result = await client.createCharacter(input);
          const entry: ImportResultEntry = {
            numericId: char.numericId,
            name: char.name,
            status: "created",
            characterId: result.id,
          };

          // Upload images for newly created character
          if (manifest && uploadImages) {
            try {
              const imgResult = await uploadCharacterImages(
                client,
                result.id,
                char.numericId,
                manifest,
                imagesDir
              );
              entry.imageStatus = imgResult.imageStatus;
              entry.imageError = imgResult.imageError;
              if (imgResult.imageStatus === "uploaded") imagesUploaded++;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              entry.imageStatus = "failed";
              entry.imageError = msg;
              imagesFailed++;
              logger.warn(`Image upload failed for ${char.numericId}: ${msg}`);
            }
          }

          entries.push(entry);
          created++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);

          // Check for unique constraint violation (idempotency)
          if (
            errorMsg.includes("unique") ||
            errorMsg.includes("already exists") ||
            errorMsg.includes("Unique constraint")
          ) {
            entries.push({
              numericId: char.numericId,
              name: char.name,
              status: "skipped_existing",
            });
            skippedExisting++;
          } else {
            entries.push({
              numericId: char.numericId,
              name: char.name,
              status: "failed",
              error: errorMsg,
            });
            failed++;
            logger.warn(`Failed to create ${char.numericId} (${char.name}): ${errorMsg}`);
          }
        }
      }

      progress.increment();
      await saveResults();
    }

    progress.finish();

    // Final save
    await saveResults();

    // Print summary
    logger.info(`\nImport complete:`);
    logger.info(`  Created: ${created}`);
    logger.info(`  Registry updated: ${registryUpdated}`);
    logger.info(`  Skipped (existing): ${skippedExisting}`);
    logger.info(`  Skipped (unmapped): ${skippedUnmapped}`);
    logger.info(`  Failed: ${failed}`);
    if (manifest) {
      logger.info(`  Images uploaded: ${imagesUploaded}`);
      logger.info(`  Images failed: ${imagesFailed}`);
    }
    logger.info(`\nResults saved to ${resultsPath}`);
  },
};
