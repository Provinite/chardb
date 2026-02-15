import * as path from "path";
import * as readline from "readline";
import type { CommandModule } from "yargs";
import { CharDBClient } from "../graphql/client";
import type {
  ImportResultEntry,
  ImportResults,
} from "../types/import-result";
import { MappingConfigSchema } from "../types/mapping-config";
import type { ParsedCharacter } from "../types/parsed-character";
import { ParsedCharacterSchema } from "../types/parsed-character";
import {
  getDataDir,
  getConfigDir,
  readJson,
  writeJson,
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
  },
  handler: async (argv) => {
    const { apiUrl, email, password, mapping: mappingPath, dryRun, force, skipUnmapped } =
      argv;

    // Load parsed characters
    const parsedPath = path.join(getDataDir(), "parsed-characters.json");
    logger.info("Loading parsed characters...");
    const parsed = await readJson(parsedPath, z.array(ParsedCharacterSchema));

    // Load mapping config
    const config = await readJson(mappingPath, MappingConfigSchema);

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
        entries.push({
          numericId: char.numericId,
          name: char.name,
          status: "skipped_existing",
          characterId: existingByRegistryId.get(char.numericId),
        });
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
        entries.push({
          numericId: char.numericId,
          name: char.name,
          status: "created",
          characterId: result.id,
        });
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
    logger.info(`\nResults saved to ${resultsPath}`);
  },
};
