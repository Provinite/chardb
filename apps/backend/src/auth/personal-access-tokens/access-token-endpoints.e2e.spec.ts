import * as request from "supertest";
import { TestApp } from "../../../test/setup-e2e";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth.module";
import { UsersModule } from "../../users/users.module";
import { ItemsModule } from "../../items/items.module";
import { SpeciesModule } from "../../species/species.module";
import { CurrenciesModule } from "../../currencies/currencies.module";
import { GalleriesModule } from "../../galleries/galleries.module";
import { CharactersModule } from "../../characters/characters.module";
import { ImagesModule } from "../../images/images.module";
import { CommunityPermission } from "../CommunityPermission";
import { ANONYMOUS_PERMISSIONS } from "../request-permissions";
import { PersonalAccessTokensService } from "./personal-access-tokens.service";

type Outcome = "ok" | "forbidden";
type Credential = "session" | "token" | "tokenWithoutMembership";

/**
 * Real endpoints, one or two behind each kind of gate, called with the
 * owner's own session and with their personal access tokens.
 *
 * `permission-guards.e2e.spec.ts` proves what each gate admits against probe
 * resolvers. This proves the same holds on handlers people actually call,
 * with their real community resolution and services behind them.
 *
 * The owner is a site admin with `canListUsers`, and holds a role with no
 * permissions in "Here", so it is a member there. `token` names "Here" with
 * membership, `canManageItems` and `canEditOwnCharacter`.
 * `tokenWithoutMembership` names "Here" with `canManageItems` alone.
 */
describe("real endpoints under a personal access token (e2e)", () => {
  let testApp: TestApp;
  const credentials = {} as Record<Credential, string>;
  const ids = {} as {
    here: string;
    elsewhere: string;
    gallery: string;
    character: string;
    specieslessCharacter: string;
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [
        DatabaseModule,
        AuthModule,
        UsersModule,
        ItemsModule,
        SpeciesModule,
        CurrenciesModule,
        GalleriesModule,
        CharactersModule,
        ImagesModule,
      ],
    });
    await testApp.clearDatabase();
    const db = testApp.getDb();

    ids.here = (await testApp.createTestCommunity("Here")).id;
    ids.elsewhere = (await testApp.createTestCommunity("Elsewhere")).id;
    const species = await testApp.createTestSpecies(ids.here);

    const owner = await testApp.createTestUser({
      username: "pat_owner",
      email: "pat_owner@example.com",
      isAdmin: true,
      canListUsers: true,
    });
    const emptyRole = await testApp.createTestRole(ids.here);
    await testApp.createTestCommunityMember(owner.id, emptyRole.id);

    ids.gallery = (
      await db.gallery.create({ data: { name: "Mine", ownerId: owner.id } })
    ).id;
    const characterOf = async (speciesId: string | null) =>
      (
        await db.character.create({
          data: {
            name: "Ridley",
            ownerId: owner.id,
            creatorId: owner.id,
            speciesId,
          },
        })
      ).id;
    ids.character = await characterOf(species.id);
    ids.specieslessCharacter = await characterOf(null);

    credentials.session = await testApp.generateTestToken(
      owner.id,
      owner.username,
    );
    const tokens = testApp.getApp().get(PersonalAccessTokensService);
    credentials.token =
      // Grants nothing global, so the creator's permissions are not asked.
      (
        await tokens.create(owner.id, ANONYMOUS_PERMISSIONS, {
          name: "endpoints",
          expiresInDays: 7,
          communities: [
            {
              communityId: ids.here,
              member: true,
              permissions: [
                CommunityPermission.CanManageItems,
                CommunityPermission.CanEditOwnCharacter,
              ],
            },
          ],
        })
      ).secret;
    credentials.tokenWithoutMembership = (
      await tokens.create(owner.id, ANONYMOUS_PERMISSIONS, {
        name: "endpoints, no membership",
        expiresInDays: 7,
        communities: [
          {
            communityId: ids.here,
            member: false,
            permissions: [CommunityPermission.CanManageItems],
          },
        ],
      })
    ).secret;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  /** What a credential gets from one operation. */
  const outcome = async (
    credential: Credential,
    document: string,
    variables: Record<string, unknown> = {},
  ): Promise<Outcome> => {
    const response = await testApp.authenticatedGraphqlRequest(
      document,
      variables,
      credentials[credential],
    );
    const [error] = response.body.errors ?? [];
    if (!error) return "ok";
    // Refused by a gate, not failed for some other reason.
    expect(error.extensions?.code).toBe("FORBIDDEN");
    return "forbidden";
  };

  const cases: Array<
    [
      gate: string,
      document: () => string,
      expected: Partial<Record<Credential, Outcome>>,
    ]
  > = [
    [
      "public query: itemTypes",
      () =>
        `query { itemTypes(filters: { communityId: "${ids.here}" }) { total } }`,
      { session: "ok", token: "ok" },
    ],
    [
      "signed in, opened to tokens: me",
      () => `query { me { username } }`,
      { session: "ok", token: "ok" },
    ],
    [
      "signed in: updateProfile",
      () =>
        `mutation { updateProfile(input: { displayName: "Renamed" }) { id } }`,
      { session: "ok", token: "forbidden" },
    ],
    [
      "self, on a field: me.privacySettings",
      () => `query { me { privacySettings } }`,
      { session: "ok", token: "forbidden" },
    ],
    [
      "global permission the owner holds: users",
      () => `query { users { totalCount } }`,
      { session: "ok", token: "forbidden" },
    ],
    [
      // The owner's own role here holds nothing: the token's grant is what
      // admits it, as a site admin may grant any community permission.
      "community permission the token was granted: createItemType here",
      () =>
        `mutation { createItemType(input: { communityId: "${ids.here}", name: "Token Gem" }) { id } }`,
      { session: "forbidden", token: "ok" },
    ],
    [
      "community permission in a community the token does not name",
      () =>
        `mutation { createItemType(input: { communityId: "${ids.elsewhere}", name: "Stray Gem" }) { id } }`,
      { session: "forbidden", token: "forbidden" },
    ],
    [
      "community permission the token was not granted: createSpecies",
      () =>
        `mutation { createSpecies(createSpeciesInput: { communityId: "${ids.here}", name: "Token Beast" }) { id } }`,
      { session: "forbidden", token: "forbidden" },
    ],
    [
      "membership, granted and held: currencies",
      () => `query { currencies(communityId: "${ids.here}") { id } }`,
      { session: "ok", token: "ok", tokenWithoutMembership: "forbidden" },
    ],
    [
      "owner of: updateGallery",
      () =>
        `mutation { updateGallery(id: "${ids.gallery}", input: { name: "Renamed" }) { id } }`,
      { session: "ok", token: "forbidden" },
    ],
    [
      "character profile editor, by an edit-own grant",
      () =>
        `mutation { updateCharacterProfile(id: "${ids.character}", input: { name: "Renamed" }) { id } }`,
      { session: "ok", token: "ok", tokenWithoutMembership: "forbidden" },
    ],
    [
      "character profile editor, owner-only branch: a character of no species",
      () =>
        `mutation { updateCharacterProfile(id: "${ids.specieslessCharacter}", input: { name: "Renamed" }) { id } }`,
      { session: "ok", token: "forbidden" },
    ],
  ];

  it.each(cases)("%s", async (_gate, document, expected) => {
    const actual: Partial<Record<Credential, Outcome>> = {};
    for (const credential of Object.keys(expected) as Credential[]) {
      actual[credential] = await outcome(credential, document());
    }
    expect(actual).toEqual(expected);
  });

  it("REST, signed in: an image upload refuses a token", async () => {
    const upload = (credential: Credential) =>
      request(testApp.getApp().getHttpServer())
        .post("/images/upload")
        .set("Authorization", `Bearer ${credentials[credential]}`);

    expect((await upload("token")).status).toBe(403);
    // The session gets past the gate, and fails later for want of a file.
    expect((await upload("session")).status).not.toBe(403);
  });
});
