# @chardb/da-import

CLI tool for importing species masterlists from DeviantArt into CharDB. Operates as a 4-phase pipeline where each phase produces inspectable intermediate files.

```
Download (DA API → JSON) → Parse (JSON → mapped JSON) → Download Images (oEmbed → files) → Import (→ CharDB)
```

## Prerequisites

- DeviantArt OAuth application credentials ([register here](https://www.deviantart.com/developers/))
- CharDB backend running locally or remotely
- Species, variants, traits, and enum values already configured in CharDB

## Setup

```bash
# From the monorepo root
yarn install

# Set DA credentials (or pass via CLI flags)
export DEVIANTART_CLIENT_ID="your-client-id"
export DEVIANTART_CLIENT_SECRET="your-client-secret"
```

## Commands

All commands are run via:

```bash
yarn workspace @chardb/da-import cli <command> [options]
```

### Phase 1: `download`

Downloads deviations from DeviantArt gallery folders into individual JSON files.

```bash
yarn workspace @chardb/da-import cli download \
  --username pillowing-archive \
  --folders "Official Pillowings,Guest Pillowings,MYO Pillowings"
```

| Flag | Default | Description |
|------|---------|-------------|
| `--username` | _(required)_ | DA username to download from |
| `--folders` | _(required)_ | Comma-separated folder names |
| `--client-id` | `$DEVIANTART_CLIENT_ID` | DA OAuth client ID |
| `--client-secret` | `$DEVIANTART_CLIENT_SECRET` | DA OAuth client secret |
| `--resume` | `false` | Resume from last saved download state |
| `--rate-limit` | `1000` | Minimum ms between API calls |

**Output:** One `data/deviations/{numericId}.json` per deviation, plus `data/download-state.json` for resumability.

### Phase 1.5: `scaffold-mapping`

Generates a `config/trait-mapping.json` template by cross-referencing downloaded DA data with CharDB's species/trait/enum schema. Trait texts that match an enum value name exactly are auto-mapped; everything else gets a `"TODO"` placeholder for manual curation.

```bash
yarn workspace @chardb/da-import cli scaffold-mapping \
  --species-name "Pillowing" \
  --community-id "your-community-uuid" \
  --email admin@test.local \
  --password pw
```

| Flag | Default | Description |
|------|---------|-------------|
| `--species-name` | _(required)_ | Species name in CharDB |
| `--community-id` | _(required)_ | Community ID in CharDB |
| `--api-url` | `http://localhost:4000/graphql` | CharDB GraphQL endpoint |
| `--email` | _(required)_ | Admin email for CharDB login |
| `--password` | _(required)_ | Admin password for CharDB login |

**Output:** `config/trait-mapping.json`

### Phase 2: `parse`

Parses downloaded deviation HTML descriptions, extracts trait lines, strips rarity prefixes, and maps them to CharDB trait/enum IDs using the mapping config.

```bash
yarn workspace @chardb/da-import cli parse
```

| Flag | Default | Description |
|------|---------|-------------|
| `--mapping` | `config/trait-mapping.json` | Path to mapping config |

**Output:** `data/parsed-characters.json` — an array of parsed characters with mapped traits, unmapped lines, and derived variant IDs.

### Phase 2.5: `download-images`

Downloads reference images for parsed characters using the DeviantArt oEmbed API. For each character, resolves up to two images:
- **Original**: The deviation image itself (from the DA page URL)
- **Current ref**: An updated reference sheet (from sta.sh links found in descriptions)

Uses the public oEmbed endpoint (`backend.deviantart.com/oembed`) to resolve page URLs to direct image URLs — no DA API credentials required.

```bash
# Test with a small batch first
yarn workspace @chardb/da-import cli download-images --limit 5

# Full download (resumes from where it left off)
yarn workspace @chardb/da-import cli download-images
```

| Flag | Default | Description |
|------|---------|-------------|
| `--rate-limit` | `2000` | Minimum milliseconds between oEmbed/download requests |
| `--force` | `false` | Re-download even if already in manifest |
| `--limit` | `0` | Max characters to process (0 = unlimited) |

Images are saved to `data/images/` as `{numericId}-original.{ext}` and `{numericId}-ref.{ext}`. The manifest tracks download status per character and is saved periodically for crash resilience.

**Output:** `data/images/` directory + `data/image-manifest.json`

### Phase 3: `import`

Creates characters in CharDB via the GraphQL API. Pre-checks for existing characters by `registryId` to ensure idempotent re-runs. Optionally uploads reference images from the manifest and sets the main media on each character.

```bash
# Dry run first
yarn workspace @chardb/da-import cli import \
  --email admin@test.local --password pw --dry-run

# Actual import
yarn workspace @chardb/da-import cli import \
  --email admin@test.local --password pw
```

| Flag | Default | Description |
|------|---------|-------------|
| `--api-url` | `http://localhost:4000/graphql` | CharDB GraphQL endpoint |
| `--email` | _(required)_ | Admin email for CharDB login |
| `--password` | _(required)_ | Admin password for CharDB login |
| `--mapping` | `config/trait-mapping.json` | Path to mapping config |
| `--dry-run` | `false` | Preview what would be imported |
| `--force` | `false` | Skip the interactive confirmation prompt |
| `--skip-unmapped` | `true` | Skip characters that have unmapped trait lines |
| `--upload-images` | `true` | Upload reference images from manifest during import |
| `--upload-images-for-existing` | `false` | Also upload images for characters that already exist |

Each character is created with:
- `registryId` set to the DA numeric ID
- `speciesVariantId` derived from the highest-rarity trait
- `traitValues` mapped from the description
- `pendingOwner` set to `{ provider: DEVIANTART, providerAccountId: ownerUsername }`
- `assignToSelf: false` (no owner until the DA account is linked)

When `--upload-images` is enabled and an image manifest exists, both the original deviation image and current ref image are uploaded to CharDB via the REST upload endpoint. The current ref is set as the character's main media (falling back to the original if no ref exists).

**Output:** `data/import-results.json` with per-character status (`created`, `skipped_existing`, `skipped_unmapped`, `failed`) and optional `imageStatus` (`uploaded`, `skipped`, `failed`, `no_image`).

### `report`

Prints diagnostic summaries of parsed or imported data.

```bash
# Parse report: rarity distribution, unmapped trait frequency, owner coverage
yarn workspace @chardb/da-import cli report --type parsed

# Import report: created/skipped/failed counts, failure details
yarn workspace @chardb/da-import cli report --type import
```

## Mapping Config

The mapping config (`config/trait-mapping.json`) drives the parse phase. It connects DA description text to CharDB IDs.

```jsonc
{
  "speciesId": "uuid",
  "communityId": "uuid",

  // Rarity levels, lowest to highest
  "rarityOrder": ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Exclusive"],

  // Ordered longest-first so "Very Rare" matches before "Rare"
  "rarityPrefixes": ["Exclusive", "Legendary", "Very Rare", "Rare", "Uncommon", "Common"],

  // Maps rarity name → CharDB species variant ID
  "rarityToVariantId": {
    "Common": "uuid",
    "Uncommon": "uuid"
  },

  // Simple rules: after stripping rarity prefix, match remaining text (case-insensitive)
  "rules": [
    { "pattern": "Bob Ears", "traitId": "uuid", "enumValueId": "uuid" },
    { "pattern": "Button Eyes", "traitId": "uuid", "enumValueId": "uuid" }
  ],

  // Composite rules: for lines that encode multiple traits (checked before simple rules)
  "compositeRules": [
    {
      "linePattern": "regex pattern",
      "extractions": [
        { "groupName": "name", "traitId": "uuid", "enumValueId": "uuid", "rarity": "Uncommon" }
      ]
    }
  ],

  // Lines matching these patterns are silently ignored
  "ignorePatterns": ["Resale Value", "Trades:", "^\\$\\d+"]
}
```

## Directory Layout

```
packages/da-import/
├── config/
│   └── trait-mapping.json    # Mapping config (generated, then manually curated)
├── data/                     # .gitignored — all runtime data
│   ├── deviations/           # One JSON per DA entry
│   ├── images/               # Downloaded reference images
│   ├── download-state.json   # Resume state for download phase
│   ├── image-manifest.json   # Image download tracking manifest
│   ├── parsed-characters.json
│   └── import-results.json
└── src/
    ├── cli.ts                # Yargs entry point
    ├── commands/             # One file per subcommand
    ├── da-api/               # DA OAuth2 client, rate limiter, types
    ├── graphql/              # CharDB GraphQL client, queries, mutations
    ├── parser/               # HTML parsing, trait extraction, trait mapping
    ├── types/                # Zod schemas for intermediate data
    └── utils/                # Logger, file I/O, progress tracking
```

## Typical Workflow

1. **Download** a small folder to test:
   ```bash
   yarn workspace @chardb/da-import cli download \
     --username pillowing-archive --folders "Official Pillowings"
   ```

2. **Scaffold** the mapping template:
   ```bash
   yarn workspace @chardb/da-import cli scaffold-mapping \
     --species-name Pillowing --community-id <uuid> \
     --email admin@test.local --password pw
   ```

3. **Curate** `config/trait-mapping.json` — replace `"TODO"` entries with correct CharDB IDs.

4. **Parse** and review:
   ```bash
   yarn workspace @chardb/da-import cli parse
   yarn workspace @chardb/da-import cli report --type parsed
   ```

5. **Download images** (resumes automatically):
   ```bash
   yarn workspace @chardb/da-import cli download-images
   ```

6. **Dry-run** the import:
   ```bash
   yarn workspace @chardb/da-import cli import \
     --email admin@test.local --password pw --dry-run
   ```

7. **Import** for real (creates characters + uploads images):
   ```bash
   yarn workspace @chardb/da-import cli import \
     --email admin@test.local --password pw
   ```

8. **Re-run** is safe — existing characters are skipped by `registryId`. Use `--upload-images-for-existing` to backfill images for previously imported characters.
