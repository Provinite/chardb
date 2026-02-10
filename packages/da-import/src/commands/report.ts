import * as path from "path";
import type { CommandModule } from "yargs";
import type { ParsedCharacter } from "../types/parsed-character";
import { ParsedCharacterSchema } from "../types/parsed-character";
import { ImportResultsSchema } from "../types/import-result";
import { getDataDir, fileExists, readJson } from "../utils/file-io";
import { logger } from "../utils/logger";
import { z } from "zod";

interface ReportArgs {
  type: string;
}

async function reportParsed(): Promise<void> {
  const parsedPath = path.join(getDataDir(), "parsed-characters.json");
  if (!(await fileExists(parsedPath))) {
    logger.error("No parsed-characters.json found. Run `parse` first.");
    return;
  }

  const parsed = await readJson(parsedPath, z.array(ParsedCharacterSchema));

  logger.info(`\n=== Parse Report ===`);
  logger.info(`Total characters: ${parsed.length}`);

  const fullyMapped = parsed.filter((c) => c.unmappedLines.length === 0);
  const withUnmapped = parsed.filter((c) => c.unmappedLines.length > 0);
  const noOwner = parsed.filter((c) => !c.ownerDaUsername);
  const noVariant = parsed.filter((c) => !c.derivedVariantId);

  logger.info(`Fully mapped: ${fullyMapped.length}`);
  logger.info(`With unmapped traits: ${withUnmapped.length}`);
  logger.info(`Without owner: ${noOwner.length}`);
  logger.info(`Without variant: ${noVariant.length}`);

  // Rarity distribution
  const rarityDist = new Map<string, number>();
  for (const c of parsed) {
    const rarity = c.derivedRarity ?? "(none)";
    rarityDist.set(rarity, (rarityDist.get(rarity) ?? 0) + 1);
  }
  logger.info(`\nRarity distribution:`);
  for (const [rarity, count] of [...rarityDist.entries()].sort()) {
    logger.info(`  ${rarity}: ${count}`);
  }

  // Folder distribution
  const folderDist = new Map<string, number>();
  for (const c of parsed) {
    folderDist.set(c.folderName, (folderDist.get(c.folderName) ?? 0) + 1);
  }
  logger.info(`\nFolder distribution:`);
  for (const [folder, count] of [...folderDist.entries()].sort()) {
    logger.info(`  ${folder}: ${count}`);
  }

  // Unmapped trait analysis
  if (withUnmapped.length > 0) {
    const unmappedCounts = new Map<string, number>();
    for (const c of withUnmapped) {
      for (const line of c.unmappedLines) {
        unmappedCounts.set(line, (unmappedCounts.get(line) ?? 0) + 1);
      }
    }

    const sorted = [...unmappedCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    );

    logger.info(`\nTop unmapped trait lines (by frequency):`);
    for (const [line, count] of sorted.slice(0, 30)) {
      logger.info(`  ${count}x "${line}"`);
    }
    if (sorted.length > 30) {
      logger.info(`  ... and ${sorted.length - 30} more unique unmapped lines`);
    }
  }
}

async function reportImport(): Promise<void> {
  const resultsPath = path.join(getDataDir(), "import-results.json");
  if (!(await fileExists(resultsPath))) {
    logger.error("No import-results.json found. Run `import` first.");
    return;
  }

  const results = await readJson(resultsPath, ImportResultsSchema);

  logger.info(`\n=== Import Report ===`);
  logger.info(`Timestamp: ${results.timestamp}`);
  logger.info(`Species ID: ${results.speciesId}`);
  logger.info(`Total processed: ${results.totalProcessed}`);
  logger.info(`Created: ${results.created}`);
  logger.info(`Skipped (existing): ${results.skippedExisting}`);
  logger.info(`Skipped (unmapped): ${results.skippedUnmapped}`);
  logger.info(`Failed: ${results.failed}`);

  // Show failures
  const failures = results.entries.filter((e) => e.status === "failed");
  if (failures.length > 0) {
    logger.info(`\nFailures:`);
    for (const f of failures) {
      logger.info(`  ${f.numericId} (${f.name}): ${f.error}`);
    }
  }
}

export const reportCommand: CommandModule<object, ReportArgs> = {
  command: "report",
  describe: "Generate diagnostic reports on parsed or imported data",
  builder: {
    type: {
      type: "string" as const,
      choices: ["parsed", "import"] as const,
      default: "parsed",
      describe: "Type of report to generate",
    },
  },
  handler: async (argv) => {
    switch (argv.type) {
      case "parsed":
        await reportParsed();
        break;
      case "import":
        await reportImport();
        break;
      default:
        logger.error(`Unknown report type: ${argv.type}`);
    }
  },
};
