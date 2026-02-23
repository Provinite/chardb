/**
 * Fetch all Pillowing characters from the production CharDB API
 * and write to data/chardb-pillowings.csv.
 *
 * Usage: yarn dlx tsx scripts/list-pillowings.ts
 */
import * as fs from "fs/promises";
import * as path from "path";

const API_URL = "https://api.chardb.cc/graphql";
const SPECIES_ID = "f0ff1d75-45dd-4f39-bc22-ffb21e96ae91";

const query = `
  query Characters($filters: CharacterFiltersInput) {
    characters(filters: $filters) {
      characters {
        id
        name
        registryId
        ownerId
      }
      total
      hasMore
    }
  }
`;

interface CharacterNode {
  id: string;
  name: string;
  registryId: string | null;
  ownerId: string | null;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function fetchAllPillowings(): Promise<CharacterNode[]> {
  const all: CharacterNode[] = [];
  let offset = 0;
  const limit = 100;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { filters: { speciesId: SPECIES_ID, limit, offset } },
      }),
    });

    if (!resp.ok) {
      throw new Error(`API request failed: ${resp.status} ${await resp.text()}`);
    }

    const json = await resp.json();

    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
    }

    const page = json.data.characters;
    all.push(...page.characters);
    console.error(`Fetched ${all.length}/${page.total}...`);

    if (!page.hasMore) break;
    offset += limit;
  }

  return all;
}

async function main() {
  console.error(`Fetching all Pillowing characters from ${API_URL}...`);
  const characters = await fetchAllPillowings();

  // Sort by name
  characters.sort((a, b) => a.name.localeCompare(b.name));

  const lines = ["registryId,name,id,ownerId"];
  for (const c of characters) {
    lines.push(
      [
        csvEscape(c.registryId ?? ""),
        csvEscape(c.name),
        c.id,
        c.ownerId ?? "",
      ].join(",")
    );
  }

  const outPath = path.join(__dirname, "..", "data", "chardb-pillowings.csv");
  await fs.writeFile(outPath, lines.join("\n") + "\n");

  console.error(`\nWrote ${characters.length} Pillowings to ${outPath}`);
  const withRegistry = characters.filter((c) => c.registryId);
  const withoutRegistry = characters.filter((c) => !c.registryId);
  console.error(`${withRegistry.length} with registryId, ${withoutRegistry.length} without`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
