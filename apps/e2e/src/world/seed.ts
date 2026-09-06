import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ARTIFACTS } from "../config.js";
import {
  createSnapshot,
  restoreSnapshot,
  snapshotExists,
  truncateAll,
} from "../db/snapshot.js";
import { makePrisma, makeSeedCtx } from "./ctx.js";
import {
  PRESETS,
  type PresetHandle,
  type PresetName,
} from "./presets/index.js";
import { statePath, writeStorageStates } from "./storage-state.js";
import { makeActor } from "./actor.js";
import type { Persona, World } from "./types.js";

const handleFile = (preset: string): string =>
  path.join(ARTIFACTS, "world", `${preset}.json`);

interface StoredHandle {
  handle: Record<string, unknown>;
  personas: Record<string, Persona>;
}

/**
 * Builds the preset into the (freshly truncated) database, snapshots it, and
 * caches the resulting handle to disk.
 *
 * Building into an empty database is what makes the globally-unique
 * Community.name and Species.name constraints a non-issue: no two presets ever
 * coexist, so their names can never collide.
 */
async function buildAndSnapshot(preset: PresetName): Promise<StoredHandle> {
  const def = PRESETS[preset];
  await truncateAll();
  const prisma = makePrisma();
  try {
    const ctx = makeSeedCtx(prisma);
    const handle = (await def.build(ctx)) as unknown as Record<string, unknown>;
    await createSnapshot(preset);
    await writeStorageStates(preset, ctx.personas);

    const stored: StoredHandle = { handle, personas: ctx.personas };
    await fs.mkdir(path.dirname(handleFile(preset)), { recursive: true });
    await fs.writeFile(handleFile(preset), JSON.stringify(stored, null, 2));
    return stored;
  } finally {
    await prisma.$disconnect();
  }
}

async function readHandle(preset: PresetName): Promise<StoredHandle | null> {
  try {
    return JSON.parse(await fs.readFile(handleFile(preset), "utf8"));
  } catch {
    return null;
  }
}

/**
 * Ensures the preset's snapshot exists, then restores it.
 *
 * Restoring rows rather than re-seeding is what keeps ids stable for the whole
 * run: the handle, the minted JWTs (which encode `sub`), the refresh cookies in
 * the storageState files, and every href selector stay valid across spec files.
 *
 * Those selectors now match a whole URL -- `a[href="<community host>/character/
 * <uuid>"]` -- because a character card links across hosts to the community
 * that owns the character. They therefore depend on the community's slug as
 * well as the character's id, and the snapshot holds both fixed.
 */
export async function seedPreset<K extends PresetName>(
  preset: K,
): Promise<World<PresetHandle<K>>> {
  if (!PRESETS[preset]) {
    throw new Error(
      `Unknown preset "${preset}". Available: ${Object.keys(PRESETS).join(", ")}`,
    );
  }

  let stored = await readHandle(preset);
  if (!stored || !(await snapshotExists(preset))) {
    stored = await buildAndSnapshot(preset);
  } else {
    await restoreSnapshot(preset);
  }

  const api = {
    preset,
    users: stored.personas,
    as: (key: string) =>
      makeActor(key, key === "anon" ? null : (stored!.personas[key] ?? null)),
    storageState: (key: string) => statePath(preset, key),
    reset: () => restoreSnapshot(preset),
  };

  return { ...stored.handle, ...api } as World<PresetHandle<K>>;
}

/** Exported standalone so a spec can opt into per-test isolation. */
export const resetWorld = (preset: PresetName): Promise<void> =>
  restoreSnapshot(preset);

/** Forces a rebuild -- used by setup so a changed preset can never go stale. */
export async function rebuildPreset(preset: PresetName): Promise<void> {
  await fs.rm(handleFile(preset), { force: true });
  await buildAndSnapshot(preset);
}
