/**
 * Fetch species traits from the production CharDB API and write to
 * config/species-traits.json.
 *
 * Usage: npx tsx scripts/fetch-species-traits.ts
 */
import * as fs from "fs/promises";
import * as path from "path";

const API_URL = "https://api.chardb.cc/graphql";
const SPECIES_ID = "f0ff1d75-45dd-4f39-bc22-ffb21e96ae91";

const query = `
  query SpeciesTraits($speciesId: ID!, $first: Int) {
    traitsBySpecies(speciesId: $speciesId, first: $first) {
      nodes {
        id
        name
        valueType
        enumValues {
          id
          name
        }
      }
    }
  }
`;

async function main() {
  console.log(`Fetching traits for species ${SPECIES_ID}...`);

  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { speciesId: SPECIES_ID, first: 100 },
    }),
  });

  if (!resp.ok) {
    throw new Error(`API request failed: ${resp.status} ${await resp.text()}`);
  }

  const json = await resp.json();

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors, null, 2)}`);
  }

  const traits = json.data.traitsBySpecies.nodes.map(
    (t: { id: string; name: string; valueType: string; enumValues: { id: string; name: string }[] }) => ({
      id: t.id,
      name: t.name,
      valueType: t.valueType,
      enumValues: t.enumValues.map((ev: { id: string; name: string }) => ({
        id: ev.id,
        name: ev.name,
      })),
    })
  );

  const outPath = path.join(__dirname, "..", "config", "species-traits.json");
  await fs.writeFile(outPath, JSON.stringify(traits, null, 2) + "\n");

  console.log(`Wrote ${traits.length} traits to ${outPath}`);
  for (const t of traits) {
    console.log(`  ${t.name}: ${t.enumValues.length} enum values (${t.valueType})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
