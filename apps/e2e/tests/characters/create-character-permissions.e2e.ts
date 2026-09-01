import { presetTest, expect } from "../../src/fixtures.js";
import {
  SeedCreateCharacterDocument,
  SeedUpdateRoleDocument,
  SeedCharacterDocument,
} from "../../src/generated/graphql.js";

const test = presetTest("community-items");

/**
 * Who may create a character in a species.
 *
 * A regression spec for a hole that was open from the day `createCharacter`
 * was written until the MYO branch (#168) closed it: the mutation carried
 * `@AllowCommunityPermission(CanCreateCharacter)` beside
 * `@AllowAnyAuthenticated()`, and `PERMISSION_OR_GUARD` is OR logic, so the
 * permission decorator never did anything. **Any logged-in user could create
 * a character in any species in any community.**
 *
 * It survived for two reasons worth remembering here. The frontend's
 * `SpeciesSelector` filters species by the permission, so the hole was only
 * reachable by calling the API directly. And the decorator was present and
 * read correctly -- there was nothing to notice at the call site.
 *
 * That second reason is why this file exists at all, and why it drives the
 * API rather than the screens. A unit test of the service would not have
 * caught the original bug, because the service had no code to test; a page
 * test would not have caught it, because the page never offered the species.
 * Only a request proves it.
 *
 * These live apart from the MYO specs on purpose. The MYO file happens to
 * assert the refusal as the setup for its own point, and deleting that test
 * -- a perfectly reasonable thing to do to a feature spec -- would take this
 * coverage with it.
 */
test.describe("creating a character in a species", () => {
  test.use({ persona: "member" });

  test.beforeEach(async ({ world }) => {
    await world.reset();
  });

  test("a member with the permission can", async ({ world }) => {
    // The baseline, and not a formality: without it, every refusal below
    // could be passing for some reason that has nothing to do with
    // permissions -- a bad species id, a rejected name, an unauthenticated
    // client.
    const { createCharacter } = await world
      .as("member")
      .gql(SeedCreateCharacterDocument, {
        input: { name: "Permitted", speciesId: world.species.id },
      });

    expect(createCharacter.id).toBeTruthy();
  });

  test("a member whose role loses the permission cannot", async ({ world }) => {
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.member,
      updateRoleInput: { canCreateCharacter: false },
    });

    await expect(
      world.as("member").gql(SeedCreateCharacterDocument, {
        input: { name: "Refused", speciesId: world.species.id },
      }),
    ).rejects.toThrow(/do not have permission to create characters/i);
  });

  test("somebody who is not in the community at all cannot", async ({
    world,
  }) => {
    // The hole as it actually was. `outsider` is a real, logged-in account
    // with no role anywhere in this community, and until the fix this
    // request succeeded.
    await expect(
      world.as("outsider").gql(SeedCreateCharacterDocument, {
        input: { name: "Trespasser", speciesId: world.species.id },
      }),
    ).rejects.toThrow(/do not have permission to create characters/i);
  });

  test("the refusal comes from the service, not the guard", async ({
    world,
  }) => {
    // The discriminating assertion, and the one that would fail if somebody
    // "fixed" this by rearranging decorators instead.
    //
    // The guard rejects with Nest's own "Forbidden resource"; the service
    // rejects with a sentence naming what was refused. Since the decorator
    // is OR'd with @AllowAnyAuthenticated it cannot be the thing answering
    // here -- so if this message ever turns into "Forbidden resource", the
    // check has moved somewhere that does not run.
    const rejection = await world
      .as("outsider")
      .gql(SeedCreateCharacterDocument, {
        input: { name: "Trespasser", speciesId: world.species.id },
      })
      .then(
        () => null,
        (err: Error) => err.message,
      );

    expect(rejection).toMatch(/do not have permission to create characters/i);
    expect(rejection).not.toMatch(/forbidden resource/i);
  });

  test("a site admin who is not a member still can", async ({ world }) => {
    // The bypass the fix carries, and the reason it carries one: the DA
    // import runs as a site admin and is not necessarily a member of the
    // community it imports into. `siteadmin` holds no role here.
    //
    // Untested, this is the half that breaks an import pipeline quietly.
    const { createCharacter } = await world
      .as("siteadmin")
      .gql(SeedCreateCharacterDocument, {
        input: { name: "Imported", speciesId: world.species.id },
      });

    expect(createCharacter.id).toBeTruthy();
  });

  test("losing the permission does not touch existing characters", async ({
    world,
  }) => {
    // Creating is gated; owning is not. Worth pinning because the obvious
    // wrong way to enforce this -- filtering characters by whether their
    // owner may create them -- would make a community's whole roster vanish
    // the moment staff changed a role.
    await world.as("commadmin").gql(SeedUpdateRoleDocument, {
      id: world.roles.member,
      updateRoleInput: { canCreateCharacter: false },
    });

    // Bramblefoot is member's, seeded before the permission was removed.
    const { character } = await world
      .as("member")
      .gql(SeedCharacterDocument, { id: world.characters.bramblefoot.id });

    expect(character.id).toBe(world.characters.bramblefoot.id);
  });
});
