import { test as setup, expect } from "@playwright/test";
import { CFG } from "../src/config.js";
import { assertSuperuser, withClient } from "../src/db/sql.js";
import { rebuildPreset, seedPreset } from "../src/world/seed.js";
import { PRESETS, type PresetName } from "../src/world/presets/index.js";
import {
  SeedCharacterDocument,
  SeedRolesByCommunityDocument,
  SeedTraitReviewQueueDocument,
} from "../src/generated/graphql.js";

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
  // The one direct database touch here: the reset mechanism itself needs
  // superuser, and that has nothing to do with application behavior.
  await withClient(CFG.databaseUrl, assertSuperuser);

  // Rebuilt unconditionally rather than cached: a preset edit must never be
  // able to leave a stale snapshot behind, and building is cheap.
  for (const preset of Object.keys(PRESETS) as PresetName[]) {
    await rebuildPreset(preset);
  }
});

/**
 * Pins community-basic's contract -- the properties the #235 specs rely on,
 * each encoding an authorization rule that is easy to get wrong when editing
 * the preset.
 *
 * Asserted through the API rather than the database. Both would catch a value
 * that was never written -- reading the `roles` table directly is in fact how
 * the canDeleteCharacter mapper bug was originally found. The API version is
 * strictly stronger because it also covers the read path: a permission that is
 * persisted correctly but not *served* correctly fails here and would pass a
 * direct table read. It is also the same path the app itself uses, so it cannot
 * drift from what the UI actually sees.
 */
setup("community-basic has the shape the specs rely on", async () => {
  const world = await seedPreset("community-basic");

  const { rolesByCommunity } = await world
    .as("commadmin")
    .gql(SeedRolesByCommunityDocument, { communityId: world.community.id });
  const byName = Object.fromEntries(
    rolesByCommunity.nodes.map((r) => [r.name, r]),
  );

  // The whole point of the custom role: the stock Moderator cannot delete.
  expect(byName["Moderator Plus"].canDeleteCharacter).toBe(true);
  expect(byName["Moderator Plus"].canEditCharacterRegistry).toBe(true);
  expect(byName["Moderator"].canDeleteCharacter).toBe(false);
  expect(byName["Member"].canDeleteCharacter).toBe(false);
  expect(byName["Member"].canEditCharacterRegistry).toBe(false);
  expect(byName["Admin"].canDeleteCharacter).toBe(true);

  // Exactly one review is queued, on the expected character.
  const { traitReviewQueue } = await world
    .as("commadmin")
    .gql(SeedTraitReviewQueueDocument, {
      communityId: world.community.id,
      first: 10,
      offset: 0,
    });
  expect(traitReviewQueue.total).toBe(1);
  expect(traitReviewQueue.items[0].review.characterId).toBe(
    world.characters.pending.id,
  );

  // The "someone else's character" target must not be owned by `member`, or
  // the hidden-strip assertion would be testing the wrong thing.
  const { character: plain } = await world
    .as("commadmin")
    .gql(SeedCharacterDocument, { id: world.characters.plain.id });
  expect(plain.owner?.id).toBe(world.users.othermember.userId);
  expect(plain.owner?.id).not.toBe(world.users.member.userId);
});
