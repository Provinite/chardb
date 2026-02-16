import * as path from "path";
import * as readline from "readline";
import type { CommandModule } from "yargs";
import { CharDBClient } from "../graphql/client";
import type {
  ImportResultEntry,
  ImportResults,
  ImageUploadStatus,
} from "../types/import-result";
import type { ImageManifest, ImageDownload } from "../types/image-manifest";
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
      const media = await client.uploadImage(
        filePath,
        characterId,
        `${entry.name} - Original`
      );
      originalMediaId = media.id;
    }
  }

  // Upload current ref image
  if (hasCurrentRef) {
    const filePath = path.join(imagesDir, entry.currentRef.localPath);
    if (await fileExists(filePath)) {
      const media = await client.uploadImage(
        filePath,
        characterId,
        `${entry.name} - Reference`
      );
      currentRefMediaId = media.id;
    }
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
      demandOption: true,
      describe: "Admin email for CharDB login",
    },
    password: {
      type: "string" as const,
      demandOption: true,
      describe: "Admin password for CharDB login",
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
    } = argv;

    // Load parsed characters
    const parsedPath = path.join(getDataDir(), "parsed-characters.json");
    logger.info("Loading parsed characters...");
    const parsed = await readJson(parsedPath, z.array(ParsedCharacterSchema));

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
      logger.info("\n=== DRY RUN — no changes will be made ===\n");
      for (const char of importable.slice(0, 10)) {
        logger.info(`  ${char.numericId}: ${char.name}`);
        logger.info(`    Owner: ${char.ownerDaUsername || "(none)"}`);
        logger.info(`    Variant: ${char.derivedRarity ?? "default"}`);
        logger.info(`    Traits: ${char.mappedTraits.length}`);
      }
      if (importable.length > 10) {
        logger.info(`  ... and ${importable.length - 10} more`);
      }
      return;
    }

    // Login
    const client = new CharDBClient(apiUrl);
    await client.login(email, password);

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
    logger.info(`  Found ${existingChars.length} existing characters (${existingByRegistryId.size} with registryId)`);

    // Count how many would be skipped
    const wouldSkipExisting = importable.filter((c) =>
      existingByRegistryId.has(c.numericId)
    ).length;
    const wouldCreate = importable.length - wouldSkipExisting;

    logger.info(`  Would create: ${wouldCreate}`);
    logger.info(`  Would skip (existing): ${wouldSkipExisting}`);

    // Review prompt
    if (!force) {
      const proceed = await promptConfirm(
        `\nProceed with importing ${wouldCreate} characters?`
      );
      if (!proceed) {
        logger.info("Import cancelled.");
        return;
      }
    }

    // Import loop
    const entries: ImportResultEntry[] = [];
    let created = 0;
    let skippedExisting = 0;
    let skippedUnmapped = 0;
    let failed = 0;
    let imagesUploaded = 0;
    let imagesFailed = 0;

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
        continue;
      }

      // Skip existing
      if (existingByRegistryId.has(char.numericId)) {
        const existingId = existingByRegistryId.get(char.numericId)!;
        const entry: ImportResultEntry = {
          numericId: char.numericId,
          name: char.name,
          status: "skipped_existing",
          characterId: existingId,
        };

        // Optionally upload images for existing characters
        if (manifest && uploadImagesForExisting) {
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

        entries.push(entry);
        skippedExisting++;
        progress.increment();
        continue;
      }

      // Create character
      try {
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
            : undefined!,
          assignToSelf: false,
          visibility: "PUBLIC",
          traitReviewSource: "IMPORT",
        };

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

      progress.increment();
    }

    progress.finish();

    // Save results
    const results: ImportResults = {
      timestamp: new Date().toISOString(),
      speciesId: config.speciesId,
      totalProcessed: parsed.length,
      created,
      skippedExisting,
      skippedUnmapped,
      failed,
      entries,
    };

    const resultsPath = path.join(getDataDir(), "import-results.json");
    await writeJson(resultsPath, results);

    // Print summary
    logger.info(`\nImport complete:`);
    logger.info(`  Created: ${created}`);
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
