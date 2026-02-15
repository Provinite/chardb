import * as path from "path";
import type { CommandModule } from "yargs";
import { z } from "zod";
import { getDataDir, writeJson, readJson, fileExists } from "../utils/file-io";
import { logger } from "../utils/logger";

const ExclusionEntrySchema = z.object({
  numericId: z.string(),
  reason: z.string(),
  excludedAt: z.string(),
});

const ExclusionsSchema = z.array(ExclusionEntrySchema);

export type ExclusionEntry = z.infer<typeof ExclusionEntrySchema>;

function getExclusionsPath(): string {
  return path.join(getDataDir(), "excluded.json");
}

export async function loadExclusions(): Promise<ExclusionEntry[]> {
  const filePath = getExclusionsPath();
  if (await fileExists(filePath)) {
    return readJson(filePath, ExclusionsSchema);
  }
  return [];
}

async function saveExclusions(entries: ExclusionEntry[]): Promise<void> {
  await writeJson(getExclusionsPath(), entries);
}

interface ExcludeArgs {
  id: string | undefined;
  reason: string;
  remove: string | undefined;
  list: boolean;
}

export const excludeCommand: CommandModule<object, ExcludeArgs> = {
  command: "exclude",
  describe: "Mark deviations as unparseable for manual adjustment later",
  builder: {
    id: {
      type: "string" as const,
      describe: "Numeric deviation ID to exclude",
    },
    reason: {
      type: "string" as const,
      default: "Manual exclusion",
      describe: "Reason for exclusion",
    },
    remove: {
      type: "string" as const,
      describe: "Numeric deviation ID to un-exclude",
    },
    list: {
      type: "boolean" as const,
      default: false,
      describe: "List all excluded deviations",
    },
  },
  handler: async (argv) => {
    const { id, reason, remove, list } = argv;

    const exclusions = await loadExclusions();

    if (list) {
      if (exclusions.length === 0) {
        logger.info("No excluded deviations.");
      } else {
        logger.info(`Excluded deviations (${exclusions.length}):`);
        for (const entry of exclusions) {
          logger.info(`  ${entry.numericId} — ${entry.reason} (${entry.excludedAt})`);
        }
      }
      return;
    }

    if (remove) {
      const before = exclusions.length;
      const filtered = exclusions.filter((e) => e.numericId !== remove);
      if (filtered.length === before) {
        logger.warn(`ID ${remove} was not in the exclusion list.`);
      } else {
        await saveExclusions(filtered);
        logger.info(`Removed ${remove} from exclusion list.`);
      }
      return;
    }

    if (!id) {
      logger.error("Specify --id to exclude or --remove to un-exclude or --list to view.");
      process.exit(1);
    }

    if (exclusions.some((e) => e.numericId === id)) {
      logger.warn(`ID ${id} is already excluded.`);
      return;
    }

    exclusions.push({
      numericId: id,
      reason,
      excludedAt: new Date().toISOString(),
    });

    await saveExclusions(exclusions);
    logger.info(`Excluded deviation ${id}: ${reason}`);
  },
};
