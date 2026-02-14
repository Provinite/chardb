import * as path from "path";
import type { CommandModule } from "yargs";
import { CharDBClient } from "../graphql/client";
import { parseDescription } from "../parser/description-parser";
import { extractTraitAndRarity } from "../parser/trait-extractor";
import type { DownloadedDeviation } from "../types/downloaded-deviation";
import { DownloadedDeviationSchema } from "../types/downloaded-deviation";
import type { MappingConfig } from "../types/mapping-config";
import {
  getDeviationsDir,
  getConfigDir,
  listJsonFiles,
  readJson,
  writeJson,
} from "../utils/file-io";
import { logger } from "../utils/logger";

interface ScaffoldArgs {
  speciesName: string;
  communityId: string;
  apiUrl: string;
  email: string;
  password: string;
}

export const scaffoldMappingCommand: CommandModule<object, ScaffoldArgs> = {
  command: "scaffold-mapping",
  describe:
    "Generate a trait-mapping.json template from DA data + CharDB schema",
  builder: {
    "species-name": {
      type: "string" as const,
      demandOption: true,
      describe: "Name of the species in CharDB",
    },
    "community-id": {
      type: "string" as const,
      demandOption: true,
      describe: "Community ID in CharDB",
    },
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
  },
  handler: async (argv) => {
    const { speciesName, communityId, apiUrl, email, password } = argv;

    const client = new CharDBClient(apiUrl);
    await client.login(email, password);

    // Fetch species
    logger.info(`Looking up species "${speciesName}" in community ${communityId}...`);
    const species = await client.getSpeciesByCommunity(communityId);
    const targetSpecies = species.find(
      (s) => s.name.toLowerCase() === speciesName.toLowerCase()
    );
    if (!targetSpecies) {
      logger.error(
        `Species "${speciesName}" not found. Available: ${species.map((s) => s.name).join(", ")}`
      );
      process.exit(1);
    }

    // Fetch variants
    logger.info("Fetching species variants...");
    const variants = await client.getVariantsBySpecies(targetSpecies.id);
    logger.info(`  Found ${variants.length} variants: ${variants.map((v) => v.name).join(", ")}`);

    // Fetch traits with enum values
    logger.info("Fetching traits...");
    const traits = await client.getTraitsBySpecies(targetSpecies.id);
    logger.info(`  Found ${traits.length} traits`);

    // Scan downloaded deviations for unique trait patterns
    logger.info("Scanning downloaded deviations for trait patterns...");
    const deviationsDir = getDeviationsDir();
    const files = await listJsonFiles(deviationsDir);

    const uniqueTraitTexts = new Set<string>();

    for (const file of files) {
      const filePath = path.join(deviationsDir, file);
      const deviation = await readJson(filePath, DownloadedDeviationSchema);
      const parsed = parseDescription(
        deviation.descriptionHtml,
        deviation.title
      );

      for (const line of parsed.traitLines) {
        const { traitText } = extractTraitAndRarity(line);
        if (traitText) {
          uniqueTraitTexts.add(traitText);
        }
      }
    }

    logger.info(`  Found ${uniqueTraitTexts.size} unique trait texts`);

    // Build mapping template
    const rarityOrder = [
      "Common",
      "Uncommon",
      "Rare",
      "Very Rare",
      "Legendary",
      "Exclusive",
    ];
    const rarityPrefixes = [
      "Exclusive",
      "Legendary",
      "Very Rare",
      "Rare",
      "Uncommon",
      "Common",
    ];

    // Build rarity-to-variant mapping with TODOs
    const rarityToVariantId: Record<string, string> = {};
    for (const rarity of rarityOrder) {
      const matchingVariant = variants.find(
        (v) => v.name.toLowerCase() === rarity.toLowerCase()
      );
      rarityToVariantId[rarity] = matchingVariant?.id ?? "TODO";
    }

    // Build rules by attempting to auto-match trait texts to enum values
    const rules: Array<{
      pattern: string;
      traitId: string;
      enumValueId: string;
    }> = [];

    // Build a lookup: lowercase enum value name → { traitId, enumValueId }
    const enumLookup = new Map<string, { traitId: string; enumValueId: string }>();
    for (const trait of traits) {
      if (trait.valueType === "enum") {
        for (const ev of trait.enumValues) {
          enumLookup.set(ev.name.toLowerCase(), {
            traitId: trait.id,
            enumValueId: ev.id,
          });
        }
      }
    }

    const unmatchedTexts: string[] = [];

    for (const text of [...uniqueTraitTexts].sort()) {
      const match = enumLookup.get(text.toLowerCase());
      if (match) {
        rules.push({
          pattern: text,
          traitId: match.traitId,
          enumValueId: match.enumValueId,
        });
      } else {
        unmatchedTexts.push(text);
        rules.push({
          pattern: text,
          traitId: "TODO",
          enumValueId: "TODO",
        });
      }
    }

    const config: MappingConfig = {
      speciesId: targetSpecies.id,
      communityId,
      rarityOrder,
      rarityPrefixes,
      rarityToVariantId,
      rules,
      compositeRules: [],
      ignorePatterns: [
        "Resale Value",
        "Trades:",
        "Gifts:",
        "^\\$\\d+",
        "^MYO",
        "Design by",
      ],
      exactLineRules: [],
      textValueTraits: [],
      deviationOverrides: [],
    };

    const outPath = path.join(getConfigDir(), "trait-mapping.json");
    await writeJson(outPath, config);

    logger.info(`\nMapping template written to ${outPath}`);
    logger.info(`  Auto-matched: ${rules.length - unmatchedTexts.length}`);
    logger.info(`  Need manual mapping (TODO): ${unmatchedTexts.length}`);
    if (unmatchedTexts.length > 0) {
      logger.info("\nUnmatched trait texts:");
      for (const text of unmatchedTexts.slice(0, 20)) {
        logger.info(`  - "${text}"`);
      }
      if (unmatchedTexts.length > 20) {
        logger.info(`  ... and ${unmatchedTexts.length - 20} more`);
      }
    }

    // Also print available CharDB traits/enum values for reference
    logger.info("\nAvailable CharDB traits and enum values:");
    for (const trait of traits) {
      if (trait.valueType === "enum") {
        logger.info(`  ${trait.name} (${trait.id}):`);
        for (const ev of trait.enumValues) {
          logger.info(`    - ${ev.name} (${ev.id})`);
        }
      }
    }
  },
};
