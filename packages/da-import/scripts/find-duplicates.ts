/**
 * Cross-reference CharDB Pillowings against parsed DA character data
 * to find potential duplicates before importing.
 *
 * Matches on exact name. Writes results to data/duplicate-matches.csv.
 *
 * Usage: yarn dlx tsx scripts/find-duplicates.ts
 */
import * as fs from "fs/promises";
import * as path from "path";

const DATA_DIR = path.resolve(__dirname, "..", "data");

interface CharDBCharacter {
  registryId: string;
  name: string;
  id: string;
  ownerId: string;
}

interface ParsedCharacter {
  numericId: string;
  name: string;
  registryId: string;
  ownerDaUsername: string;
  url: string;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function loadCharDBPillowings(): Promise<CharDBCharacter[]> {
  const csvPath = path.join(DATA_DIR, "chardb-pillowings.csv");
  const raw = await fs.readFile(csvPath, "utf-8");
  const lines = raw.trim().split("\n").slice(1); // skip header

  return lines.map((line) => {
    // Simple CSV parse — our data doesn't have commas in fields except possibly names
    const match = line.match(/^([^,]*),("(?:[^"]|"")*"|[^,]*),([^,]*),([^,]*)$/);
    if (!match) throw new Error(`Failed to parse CSV line: ${line}`);
    const [, registryId, rawName, id, ownerId] = match;
    const name = rawName.startsWith('"')
      ? rawName.slice(1, -1).replace(/""/g, '"')
      : rawName;
    return { registryId, name, id, ownerId };
  });
}

async function loadParsedCharacters(): Promise<ParsedCharacter[]> {
  const jsonPath = path.join(DATA_DIR, "parsed-characters.json");
  const raw = await fs.readFile(jsonPath, "utf-8");
  return JSON.parse(raw);
}

async function main() {
  const [chardb, parsed] = await Promise.all([
    loadCharDBPillowings(),
    loadParsedCharacters(),
  ]);

  console.error(`Loaded ${chardb.length} CharDB Pillowings`);
  console.error(`Loaded ${parsed.length} parsed DA characters`);

  // Build lookup maps by normalized name
  const chardbByName = new Map<string, CharDBCharacter[]>();
  for (const c of chardb) {
    const key = normalize(c.name);
    const existing = chardbByName.get(key) ?? [];
    existing.push(c);
    chardbByName.set(key, existing);
  }

  const matches: Array<{
    daName: string;
    daRegistryId: string;
    daOwner: string;
    daUrl: string;
    chardbName: string;
    chardbId: string;
    chardbRegistryId: string;
    chardbOwnerId: string;
  }> = [];

  for (const da of parsed) {
    const key = normalize(da.name);
    const found = chardbByName.get(key);
    if (found) {
      for (const cb of found) {
        matches.push({
          daName: da.name,
          daRegistryId: da.registryId,
          daOwner: da.ownerDaUsername,
          daUrl: da.url,
          chardbName: cb.name,
          chardbId: cb.id,
          chardbRegistryId: cb.registryId,
          chardbOwnerId: cb.ownerId,
        });
      }
    }
  }

  // Sort by DA name
  matches.sort((a, b) => a.daName.localeCompare(b.daName));

  const header = "da_name,da_registryId,da_owner,da_url,chardb_name,chardb_id,chardb_registryId,chardb_ownerId";
  const lines = [header];
  for (const m of matches) {
    lines.push(
      [
        csvEscape(m.daName),
        csvEscape(m.daRegistryId),
        csvEscape(m.daOwner),
        csvEscape(m.daUrl),
        csvEscape(m.chardbName),
        m.chardbId,
        csvEscape(m.chardbRegistryId),
        m.chardbOwnerId,
      ].join(",")
    );
  }

  const outPath = path.join(DATA_DIR, "duplicate-matches.csv");
  await fs.writeFile(outPath, lines.join("\n") + "\n");

  console.error(`\nFound ${matches.length} matches`);
  console.error(`Results written to ${outPath}`);

  if (matches.length > 0) {
    console.error("\nMatches:");
    for (const m of matches) {
      console.error(`  "${m.daName}" (DA: ${m.daRegistryId}) <-> "${m.chardbName}" (CharDB: ${m.chardbId})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
