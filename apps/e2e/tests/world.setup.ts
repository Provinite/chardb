import { test as setup, expect } from "@playwright/test";
import { CFG } from "../src/config.js";
import { assertSuperuser, withClient } from "../src/db/sql.js";
import { rebuildPreset, seedPreset } from "../src/world/seed.js";
import { PRESETS, type PresetName } from "../src/world/presets/index.js";

setup("servers are reachable", async ({ request }) => {
  const health = await request.get(`${CFG.backendUrl}/health`);
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe("ok");

  const app = await request.get(CFG.frontendUrl);
  expect(app.ok()).toBeTruthy();
  expect(await app.text()).toContain('<div id="root">');
});

setup("build preset snapshots", async () => {
  setup.setTimeout(300_000);
  await withClient(CFG.databaseUrl, assertSuperuser);

  // Rebuilt unconditionally rather than cached: a preset edit must never be able
  // to leave a stale snapshot behind, and building is cheap.
  for (const preset of Object.keys(PRESETS) as PresetName[]) {
    await rebuildPreset(preset);
  }
});

/**
 * Pins community-basic's contract. These are the properties the #235 specs
 * depend on, and each one encodes an authorization rule that is easy to get
 * wrong when editing the preset.
 */
setup("community-basic has the shape the specs rely on", async () => {
  const world = await seedPreset("community-basic");

  await withClient(CFG.databaseUrl, async (c) => {
    const pending = await c.query(
      `SELECT character_id FROM trait_reviews WHERE status = 'PENDING'`,
    );
    expect(pending.rowCount, "exactly one PENDING trait review").toBe(1);
    expect(pending.rows[0].character_id).toBe(world.characters.pending.id);

    const roles = await c.query<{
      name: string;
      can_delete_character: boolean;
      can_edit_character_registry: boolean;
    }>(`SELECT name, can_delete_character, can_edit_character_registry FROM roles`);
    const byName = Object.fromEntries(roles.rows.map((r) => [r.name, r]));

    // The whole point of the custom role: the stock Moderator cannot delete.
    expect(byName["Moderator Plus"].can_delete_character).toBe(true);
    expect(byName["Moderator Plus"].can_edit_character_registry).toBe(true);
    expect(byName["Moderator"].can_delete_character).toBe(false);
    expect(byName["Member"].can_delete_character).toBe(false);
    expect(byName["Member"].can_edit_character_registry).toBe(false);
    expect(byName["Admin"].can_delete_character).toBe(true);

    // The "someone else's character" target must not be owned by `member`,
    // or the hidden-strip assertion would be testing the wrong thing.
    const plain = await c.query(
      `SELECT owner_id FROM characters WHERE id = $1`,
      [world.characters.plain.id],
    );
    expect(plain.rows[0].owner_id).toBe(world.users.othermember.userId);
    expect(plain.rows[0].owner_id).not.toBe(world.users.member.userId);
  });
});
