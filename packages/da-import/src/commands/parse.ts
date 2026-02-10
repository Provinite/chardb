import * as path from "path";
import type { CommandModule } from "yargs";
import { parseDescription } from "../parser/description-parser";
import { mapTraitLines, deriveVariant } from "../parser/trait-mapper";
import { DownloadedDeviationSchema } from "../types/downloaded-deviation";
import { MappingConfigSchema } from "../types/mapping-config";
import type { ParsedCharacter } from "../types/parsed-character";
import {
  getDataDir,
  getDeviationsDir,
  getConfigDir,
  listJsonFiles,
  readJson,
  writeJson,
} from "../utils/file-io";
import { logger } from "../utils/logger";
import { ProgressTracker } from "../utils/progress";
import { loadExclusions } from "./exclude";

interface ParseArgs {
  mapping: string;
}

export const parseCommand: CommandModule<object, ParseArgs> = {
  command: "parse",
  describe: "Parse downloaded deviations and map traits to CharDB IDs",
  builder: {
    mapping: {
      type: "string" as const,
      default: path.join(getConfigDir(), "trait-mapping.json"),
      describe: "Path to trait mapping config file",
    },
  },
  handler: async (argv) => {
    const { mapping: mappingPath } = argv;

    // Load mapping config
    logger.info(`Loading mapping config from ${mappingPath}...`);
    const config = await readJson(mappingPath, MappingConfigSchema);

    // Validate mapping config — check for TODOs
    const todoRules = config.rules.filter(
      (r) => r.traitId === "TODO" || r.enumValueId === "TODO"
    );
    if (todoRules.length > 0) {
      logger.warn(
        `${todoRules.length} rules still have TODO placeholders — these traits won't be mapped.`
      );
    }

    const todoVariants = Object.entries(config.rarityToVariantId).filter(
      ([, id]) => id === "TODO"
    );
    if (todoVariants.length > 0) {
      logger.warn(
        `${todoVariants.length} rarity-to-variant mappings still have TODO placeholders.`
      );
    }

    // Load exclusions
    const exclusions = await loadExclusions();
    const excludedIds = new Set(exclusions.map((e) => e.numericId));

    // Load deviations
    const deviationsDir = getDeviationsDir();
    const allFiles = await listJsonFiles(deviationsDir);
    const files = allFiles.filter(
      (f) => !excludedIds.has(f.replace(".json", ""))
    );
    logger.info(
      `Found ${allFiles.length} downloaded deviations` +
        (excludedIds.size > 0
          ? ` (${excludedIds.size} excluded, parsing ${files.length}).`
          : ".")
    );

    const parsedCharacters: ParsedCharacter[] = [];
    const progress = new ProgressTracker(files.length, "Parsing");

    let totalMapped = 0;
    let totalUnmapped = 0;

    for (const file of files) {
      const filePath = path.join(deviationsDir, file);
      const deviation = await readJson(filePath, DownloadedDeviationSchema);

      // Parse description HTML
      const parsed = parseDescription(
        deviation.descriptionHtml,
        deviation.title
      );

      // Map trait lines
      const { mappedTraits, unmappedLines, warnings } = mapTraitLines(
        parsed.traitLines,
        config
      );

      // Filter out TODO-mapped traits
      const validMappedTraits = mappedTraits.filter(
        (t) => t.traitId !== "TODO" && t.enumValueId !== "TODO"
      );

      // Derive variant from rarity
      const { variantId, rarity } = deriveVariant(validMappedTraits, config);

      const character: ParsedCharacter = {
        numericId: deviation.numericId,
        name: parsed.characterName || deviation.title,
        ownerDaUsername: parsed.ownerUsername,
        folderName: deviation.folderName,
        url: deviation.url,
        mappedTraits: validMappedTraits,
        unmappedLines,
        warnings,
        derivedVariantId: variantId,
        derivedRarity: rarity,
      };

      parsedCharacters.push(character);
      totalMapped += validMappedTraits.length;
      totalUnmapped += unmappedLines.length;

      progress.increment();
    }

    progress.finish();

    // Save results
    const outPath = path.join(getDataDir(), "parsed-characters.json");
    await writeJson(outPath, parsedCharacters);

    // Print summary
    const fullyMapped = parsedCharacters.filter(
      (c) => c.unmappedLines.length === 0
    ).length;
    const withUnmapped = parsedCharacters.filter(
      (c) => c.unmappedLines.length > 0
    ).length;
    const noOwner = parsedCharacters.filter(
      (c) => !c.ownerDaUsername
    ).length;

    logger.info(`\nParse results:`);
    logger.info(`  Total characters: ${parsedCharacters.length}`);
    logger.info(`  Fully mapped: ${fullyMapped}`);
    logger.info(`  With unmapped traits: ${withUnmapped}`);
    logger.info(`  Without owner: ${noOwner}`);
    logger.info(`  Total mapped traits: ${totalMapped}`);
    logger.info(`  Total unmapped lines: ${totalUnmapped}`);
    logger.info(`\nSaved to ${outPath}`);
  },
};
