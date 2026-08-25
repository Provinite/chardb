import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface ExcludedEntry {
  numericId: string;
  reason: string;
  excludedAt: string;
}

const data: ExcludedEntry[] = JSON.parse(
  readFileSync(resolve(__dirname, "../data/excluded.json"), "utf-8")
);

// Group by reason
const grouped = new Map<string, ExcludedEntry[]>();
for (const entry of data) {
  const existing = grouped.get(entry.reason) ?? [];
  existing.push(entry);
  grouped.set(entry.reason, existing);
}

const lines: string[] = [];
lines.push("# Excluded Deviations");
lines.push("");
lines.push(
  `**${data.length}** deviations excluded from automated import and require manual review.`
);
lines.push("");

for (const [reason, entries] of grouped) {
  lines.push(`## ${reason} (${entries.length})`);
  for (const entry of entries) {
    const url = `https://www.deviantart.com/deviation/${entry.numericId}`;
    lines.push(`- ${url}`);
  }
  lines.push("");
}

console.log(lines.join("\n"));
