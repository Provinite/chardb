/**
 * Fetch species variant enum value settings from the production CharDB API
 * and write to config/variant-settings.json.
 *
 * Usage: npx tsx scripts/fetch-variant-settings.ts
 */
import * as fs from "fs/promises";
import * as path from "path";

const API_URL = "https://api.chardb.cc/graphql";
const SPECIES_ID = "f0ff1d75-45dd-4f39-bc22-ffb21e96ae91";

const query = `
  query SpeciesVariants($speciesId: ID!, $first: Int) {
    speciesVariantsBySpecies(speciesId: $speciesId, first: $first) {
      nodes {
        id
        name
        enumValueSettings {
          enumValueId
        }
      }
    }
  }
`;

async function main() {
  console.log(`Fetching variant settings for species ${SPECIES_ID}...`);

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

  const variants = json.data.speciesVariantsBySpecies.nodes.map(
    (v: { id: string; name: string; enumValueSettings: { enumValueId: string }[] }) => ({
      id: v.id,
      name: v.name,
      allowedEnumValueIds: v.enumValueSettings.map(
        (s: { enumValueId: string }) => s.enumValueId
      ),
    })
  );

  const outPath = path.join(__dirname, "..", "config", "variant-settings.json");
  await fs.writeFile(outPath, JSON.stringify(variants, null, 2) + "\n");

  console.log(`Wrote ${variants.length} variants to ${outPath}`);
  for (const v of variants) {
    console.log(`  ${v.name}: ${v.allowedEnumValueIds.length} allowed enum values`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
