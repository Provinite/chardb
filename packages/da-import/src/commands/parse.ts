import * as fs from "fs/promises";
import * as path from "path";
import type { CommandModule } from "yargs";
import { parseDescription } from "../parser/description-parser";
import {
  mapTraitLines,
  deriveVariant,
  type VariantSetting,
} from "../parser/trait-mapper";
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

    // Load variant settings
    const variantSettingsPath = path.join(
      getConfigDir(),
      "variant-settings.json"
    );
    const variantSettings: VariantSetting[] = JSON.parse(
      await fs.readFile(variantSettingsPath, "utf-8")
    );
    logger.info(
      `Loaded ${variantSettings.length} variant settings from ${variantSettingsPath}`
    );

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

    // Build deviation override lookup
    const deviationOverrides = new Map(
      config.deviationOverrides.map((o) => [o.numericId, o.traits])
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
        deviation.title,
        config.exactLineRules
      );

      // Map trait lines
      const { mappedTraits, unmappedLines, warnings } = mapTraitLines(
        parsed.traitLines,
        config
      );

      // Filter out TODO-mapped traits
      const validMappedTraits = mappedTraits.filter(
        (t) =>
          t.traitId !== "TODO" &&
          (!("enumValueId" in t) || t.enumValueId !== "TODO")
      );

      // Add traits from exact line matches
      for (const match of parsed.exactLineMatches) {
        for (const mapping of match.mappings) {
          validMappedTraits.push({
            traitId: mapping.traitId,
            enumValueId: mapping.enumValueId,
            rarity: mapping.rarity,
            sourceLine: match.line,
          });
        }
      }

      // Add text-value traits from config
      for (const tvt of config.textValueTraits) {
        if (tvt.source === "deviationUrl") {
          validMappedTraits.push({
            traitId: tvt.traitId,
            textValue: deviation.url,
            sourceLine: deviation.url,
          });
        }
      }

      // Assign category badge
      if (config.categoryBadges) {
        const badgeEnumId = config.categoryBadges.mappings[parsed.category];
        if (badgeEnumId) {
          validMappedTraits.push({
            traitId: config.categoryBadges.traitId,
            enumValueId: badgeEnumId,
            sourceLine: `Category: ${parsed.category}`,
          });
        } else {
          parsed.warnings.push(
            `No category badge mapping for category: "${parsed.category}"`
          );
        }

        // Assign retired badge if category matches a retired pattern
        if (config.categoryBadges.retiredBadgeEnumId && config.categoryBadges.retiredPatterns) {
          const catLower = parsed.category.toLowerCase();
          const isRetired = config.categoryBadges.retiredPatterns.some(
            (p) => catLower.includes(p.toLowerCase())
          );
          if (isRetired) {
            validMappedTraits.push({
              traitId: config.categoryBadges.traitId,
              enumValueId: config.categoryBadges.retiredBadgeEnumId,
              sourceLine: `Category: ${parsed.category} (retired)`,
            });
          }
        }
      }

      // Apply deviation-specific overrides
      const overrideTraits = deviationOverrides.get(deviation.numericId);
      if (overrideTraits) {
        for (const ot of overrideTraits) {
          validMappedTraits.push({
            traitId: ot.traitId,
            enumValueId: ot.enumValueId,
            rarity: ot.rarity,
            sourceLine: `Deviation override (${deviation.numericId})`,
          });
        }
      }

      // Assign badges based on description HTML content
      for (const db of config.descriptionBadges) {
        if (new RegExp(db.pattern, "i").test(deviation.descriptionHtml)) {
          validMappedTraits.push({
            traitId: db.traitId,
            enumValueId: db.enumValueId,
            sourceLine: `Description match: ${db.pattern}`,
          });
        }
      }

      // Promote multiple Single Accessory → Multiple Accessories, then deduplicate
      const SINGLE_ACCESSORY_ENUM = "328f185a-1c3f-4a24-8415-d283cc2691b9";
      const MULTIPLE_ACCESSORIES_ENUM = "87c9cf69-539e-40ca-8e5e-ed5654f8935f";
      const ACCENTS_TRAIT = "24b0cb2b-c7fb-4565-9922-9754168466b6";

      const singleAccessoryCount = validMappedTraits.filter(
        (t) => "enumValueId" in t && t.enumValueId === SINGLE_ACCESSORY_ENUM
      ).length;

      if (singleAccessoryCount > 1) {
        // Replace first Single Accessory with Multiple Accessories
        for (const t of validMappedTraits) {
          if ("enumValueId" in t && t.enumValueId === SINGLE_ACCESSORY_ENUM) {
            t.enumValueId = MULTIPLE_ACCESSORIES_ENUM;
            t.traitId = ACCENTS_TRAIT;
            t.rarity = "Uncommon";
            break;
          }
        }
      }

      // Deduplicate by traitId+value
      const deduped: typeof validMappedTraits = [];
      const seen = new Set<string>();
      for (const t of validMappedTraits) {
        const key =
          "enumValueId" in t
            ? `${t.traitId}|${t.enumValueId}`
            : `${t.traitId}|text:${t.textValue}`;
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(t);
      }

      // Derive variant from rarity
      const { variantId, rarity } = deriveVariant(
        deduped,
        config,
        variantSettings
      );

      const allWarnings = [...parsed.warnings, ...warnings];

      const character: ParsedCharacter = {
        numericId: deviation.numericId,
        name: parsed.characterName || deviation.title,
        ownerDaUsername: parsed.ownerUsername,
        category: parsed.category,
        folderName: deviation.folderName,
        url: deviation.url,
        mappedTraits: deduped,
        unmappedLines,
        warnings: allWarnings,
        derivedVariantId: variantId,
        derivedRarity: rarity,
      };

      parsedCharacters.push(character);
      totalMapped += deduped.length;
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
