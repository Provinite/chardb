#!/usr/bin/env node
/**
 * Lists the Halloween bot's images and writes them where the backend can
 * import them.
 *
 * The images live in the frontend's public folder, so the frontend deploy
 * publishes them and they are served from FRONTEND_URL. A candy is named by
 * its slug (`candy/candy-corn.png`), and the slug is the candy's id, so a
 * candy file must never be renamed once the event has run; adding a candy
 * is adding a file and running this. Author icons are still picked by number
 * (`icon/3.png`), so the bot only needs to know how many there are.
 *
 * Candy board backgrounds are `backgrounds/full/<slug>.webp` (a picture that
 * fills the board, 4:3) and `backgrounds/tiles/tile-<name>.webp` (a seamless
 * tile, stored at twice the size it is shown at). The backend gets their
 * slugs, to check a board's choice; the frontend gets each one's kind and
 * size, to draw and offer them. A slug is a board's saved choice, so a
 * background file is never renamed either.
 *
 * Fails if a candy is not `<kebab-case-slug>.png`, is not really a PNG, or is
 * a byte-for-byte copy of another candy; if the icon numbering has a gap or a
 * file is not `<number>.png`, since the bot would then point Discord at an
 * image that is not there; and if a background is misnamed -- a tile without
 * its `tile-` prefix, or a full picture with one -- or is not a WebP.
 *
 * CI regenerates both files and fails if they differ from what is committed.
 *
 * Usage: node scripts/halloween-images.mjs
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = path.join(ROOT, "apps/frontend/public/halloween");
const OUTPUT = path.join(
  ROOT,
  "apps/backend/src/halloween/discord/images.generated.ts",
);
const BACKGROUNDS_OUTPUT = path.join(
  ROOT,
  "apps/frontend/src/components/halloween/backgrounds.generated.ts",
);

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A WebP's width and height, from its header: lossy (`VP8 `), lossless
 * (`VP8L`) or extended (`VP8X`). Null if it is not a WebP at all.
 */
function webpSize(bytes) {
  if (
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: bytes.readUIntLE(24, 3) + 1,
      height: bytes.readUIntLE(27, 3) + 1,
    };
  }
  return null;
}

/** The board backgrounds, full pictures then tiles, each sorted by slug. */
function listBackgrounds() {
  const backgrounds = [];
  for (const [folder, kind] of [
    ["full", "full"],
    ["tiles", "tile"],
  ]) {
    const dir = path.join(IMAGES, "backgrounds", folder);
    for (const file of readdirSync(dir).sort()) {
      const relative = path.relative(ROOT, path.join(dir, file));
      const slug = file.replace(/\.webp$/, "");
      if (!file.endsWith(".webp") || !SLUG.test(slug)) {
        throw new Error(`${relative} is not named <kebab-case-slug>.webp`);
      }
      if ((kind === "tile") !== slug.startsWith("tile-")) {
        throw new Error(
          kind === "tile"
            ? `${relative} is a tile, so its name must start with tile-`
            : `${relative} is a full picture, so its name must not start with tile-`,
        );
      }
      const size = webpSize(readFileSync(path.join(dir, file)));
      if (!size) {
        throw new Error(`${relative} is not a WebP`);
      }
      backgrounds.push({ slug, kind, ...size });
    }
  }
  return backgrounds;
}

/**
 * Icons 0-5 sign as Daphne and 6-10 as Luther (`HalloweenUi.author`), so
 * the number of icons is fixed until those names live with the images.
 */
const AUTHOR_ICON_COUNT = 11;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** The slugs of the `candy/<slug>.png` images, sorted. */
function listCandySlugs() {
  const dir = path.join(IMAGES, "candy");
  const slugs = [];
  const seen = new Map();
  for (const file of readdirSync(dir).sort()) {
    const relative = path.relative(ROOT, path.join(dir, file));
    const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.png$/.exec(file);
    if (!match) {
      throw new Error(`${relative} is not named <kebab-case-slug>.png`);
    }
    const bytes = readFileSync(path.join(dir, file));
    if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      throw new Error(`${relative} is not a PNG`);
    }
    const hash = createHash("sha256").update(bytes).digest("hex");
    const copyOf = seen.get(hash);
    if (copyOf) {
      throw new Error(`${relative} is the same image as ${copyOf}`);
    }
    seen.set(hash, relative);
    slugs.push(match[1]);
  }
  if (!slugs.length) {
    throw new Error(`${path.relative(ROOT, dir)} has no images`);
  }
  return slugs;
}

/** How many `<folder>/N.png` images there are, numbered 0 to N-1. */
function countNumbered(folder) {
  const dir = path.join(IMAGES, folder);
  const numbers = [];
  for (const file of readdirSync(dir)) {
    const match = /^(0|[1-9]\d*)\.png$/.exec(file);
    if (!match) {
      throw new Error(
        `${path.relative(ROOT, path.join(dir, file))} is not named <number>.png`,
      );
    }
    numbers.push(Number(match[1]));
  }
  numbers.sort((a, b) => a - b);
  numbers.forEach((n, i) => {
    if (n !== i) {
      throw new Error(
        `${path.relative(ROOT, dir)} has no ${i}.png; images must be numbered 0 to N-1 with no gaps`,
      );
    }
  });
  if (!numbers.length) {
    throw new Error(`${path.relative(ROOT, dir)} has no images`);
  }
  return numbers.length;
}

try {
  const candy = listCandySlugs();
  const backgrounds = listBackgrounds();
  const icons = countNumbered("icon");
  if (icons !== AUTHOR_ICON_COUNT) {
    throw new Error(
      `apps/frontend/public/halloween/icon has ${icons} icons; the author names expect ${AUTHOR_ICON_COUNT}`,
    );
  }

  writeFileSync(
    OUTPUT,
    `// Generated by scripts/halloween-images.mjs from apps/frontend/public/halloween.
// Do not edit: add or remove images there and run \`yarn halloween:images\`.

/**
 * The slugs of the \`candy/<slug>.png\` images. A slug is the candy's id, so a
 * candy file is never renamed.
 */
export const CANDY_SLUGS: readonly string[] = [
${candy.map((slug) => `  "${slug}",`).join("\n")}
];

/** How many \`icon/N.png\` author icons there are, numbered 0 to N-1. */
export const AUTHOR_ICON_COUNT = ${icons};

/**
 * The slugs of the candy board backgrounds a board may choose. A slug is the
 * board's saved choice, so a background file is never renamed.
 */
export const BACKGROUND_SLUGS: readonly string[] = [
${backgrounds.map(({ slug }) => `  "${slug}",`).join("\n")}
];
`,
  );
  writeFileSync(
    BACKGROUNDS_OUTPUT,
    `// Generated by scripts/halloween-images.mjs from apps/frontend/public/halloween.
// Do not edit: add or remove backgrounds there and run \`yarn halloween:images\`.

export interface BoardBackground {
  slug: string;
  /** A picture that fills the board, or a tile that repeats across it. */
  kind: "full" | "tile";
  /** The file's size in pixels. A tile is shown at half of it. */
  width: number;
  height: number;
}

/** Full pictures, then tiles, each sorted by slug. */
export const BOARD_BACKGROUNDS: readonly BoardBackground[] = [
${backgrounds
  .map(
    ({ slug, kind, width, height }) =>
      `  { slug: "${slug}", kind: "${kind}", width: ${width}, height: ${height} },`,
  )
  .join("\n")}
];
`,
  );
  console.log(
    `Halloween images: ${candy.length} candy, ${icons} icons, ${backgrounds.length} backgrounds -> ${path.relative(ROOT, OUTPUT)}, ${path.relative(ROOT, BACKGROUNDS_OUTPUT)}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
