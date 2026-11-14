import { TestApp } from "../../test/setup-e2e";
import { CharactersModule } from "./characters.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

const MY_EDITABLE_CHARACTERS = `
  query {
    myEditableCharacters(filters: { limit: 100 }) {
      total
      characters { name }
    }
  }
`;

const MY_CHARACTERS_FOR_IMAGE_UPLOAD = `
  query {
    myCharactersForImageUpload(filters: { limit: 100 }) {
      total
      characters { name }
    }
  }
`;

/**
 * Which characters a member's roles let them edit or upload to, community by
 * community. One community per permission, so a permission leaking from one
 * community into another shows up as an extra name.
 */
describe("characters a member may edit or upload to (e2e)", () => {
  let testApp: TestApp;
  let viewerId: string;
  let otherId: string;
  let viewerToken: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, CharactersModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const viewer = await testApp.createTestUser({
      username: "viewer",
      email: "viewer@example.com",
    });
    const other = await testApp.createTestUser({
      username: "other",
      email: "other@example.com",
    });
    viewerId = viewer.id;
    otherId = other.id;
    viewerToken = await testApp.generateTestToken(viewerId, viewer.username);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  /**
   * A community where the viewer holds a role with exactly these permissions,
   * or no role at all when `viewerRole` is null. Returns its species.
   */
  const community = async (
    name: string,
    viewerRole: Record<string, boolean> | null,
  ): Promise<string> => {
    const created = await testApp.createTestCommunity(name);
    const species = await testApp.createTestSpecies(created.id, name);
    if (viewerRole) {
      const role = await testApp.createTestRole(created.id, viewerRole);
      await testApp.createTestCommunityMember(viewerId, role.id);
    }
    // Somebody else holds everything here, so a query that forgot to ask
    // whose role it is would let the viewer in.
    const staff = await testApp.createTestRole(created.id, {
      canEditCharacter: true,
      canEditCharacterRegistry: true,
      canEditOwnCharacter: true,
      canEditOwnCharacterRegistry: true,
      canCreateOrphanedCharacter: true,
      canUploadCharacterImages: true,
      canUploadOwnCharacterImages: true,
    });
    await testApp.createTestCommunityMember(otherId, staff.id);
    return species.id;
  };

  /** One character owned by the viewer, one by someone else, one by nobody. */
  const characters = async (prefix: string, speciesId: string | null) => {
    const owners: Array<[string, string | null]> = [
      ["own", viewerId],
      ["other", otherId],
      ["orphan", null],
    ];
    for (const [suffix, ownerId] of owners) {
      // A character with no species always has an owner.
      if (!speciesId && !ownerId) continue;
      await testApp.getDb().character.create({
        data: {
          name: `${prefix}-${suffix}`,
          ownerId,
          creatorId: otherId,
          speciesId,
        },
      });
    }
  };

  const names = async (query: string, field: string): Promise<string[]> => {
    const response = await testApp.authenticatedGraphqlRequest(
      query,
      {},
      viewerToken,
    );
    expect(response.body.errors).toBeUndefined();
    const connection = response.body.data[field] as {
      total: number;
      characters: Array<{ name: string }>;
    };
    expect(connection.total).toBe(connection.characters.length);
    return connection.characters.map((character) => character.name).sort();
  };

  it("lists the characters each of the member's roles lets them edit", async () => {
    await characters(
      "edit-own",
      await community("edit-own", { canEditOwnCharacter: true }),
    );
    await characters(
      "registry-own",
      await community("registry-own", { canEditOwnCharacterRegistry: true }),
    );
    await characters(
      "edit-any",
      await community("edit-any", { canEditCharacter: true }),
    );
    await characters(
      "registry-any",
      await community("registry-any", { canEditCharacterRegistry: true }),
    );
    await characters(
      "orphans",
      await community("orphans", { canCreateOrphanedCharacter: true }),
    );
    await characters("no-flags", await community("no-flags", {}));
    await characters("not-a-member", await community("not-a-member", null));
    await characters("no-species", null);

    expect(
      await names(MY_EDITABLE_CHARACTERS, "myEditableCharacters"),
    ).toEqual(
      [
        "edit-own-own",
        "registry-own-own",
        "edit-any-own",
        "edit-any-other",
        "edit-any-orphan",
        "registry-any-own",
        "registry-any-other",
        "registry-any-orphan",
        "orphans-orphan",
        "no-species-own",
      ].sort(),
    );
  });

  it("lists the characters each of the member's roles lets them upload to", async () => {
    await characters(
      "upload-own",
      await community("upload-own", { canUploadOwnCharacterImages: true }),
    );
    await characters(
      "upload-any",
      await community("upload-any", { canUploadCharacterImages: true }),
    );
    await characters(
      "edit-only",
      await community("edit-only", { canEditCharacter: true }),
    );
    await characters("not-a-member", await community("not-a-member", null));
    await characters("no-species", null);

    expect(
      await names(MY_CHARACTERS_FOR_IMAGE_UPLOAD, "myCharactersForImageUpload"),
    ).toEqual(
      [
        "upload-own-own",
        "upload-any-own",
        "upload-any-other",
        "upload-any-orphan",
        "no-species-own",
      ].sort(),
    );
  });

  it("gives someone in no community only their own speciesless characters", async () => {
    await characters("not-a-member", await community("not-a-member", null));
    await characters("no-species", null);

    expect(
      await names(MY_EDITABLE_CHARACTERS, "myEditableCharacters"),
    ).toEqual(["no-species-own"]);
    expect(
      await names(MY_CHARACTERS_FOR_IMAGE_UPLOAD, "myCharactersForImageUpload"),
    ).toEqual(["no-species-own"]);
  });
});
