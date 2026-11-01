import { TestApp, CHARACTER_QUERIES } from "../../test/setup-e2e";
import { CharactersModule } from "./characters.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { Visibility } from "@chardb/database";

describe("CharactersResolver (e2e)", () => {
  let testApp: TestApp;
  let testUserId: string;
  let testToken: string;
  let testSpeciesId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, CharactersModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const testUser = await testApp.createTestUser();
    testUserId = testUser.id;
    testToken = await testApp.generateTestToken(testUserId, testUser.username);
    const setup = await testApp.createTestCommunitySetup(testUserId);
    testSpeciesId = setup.speciesId;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("createCharacter", () => {
    it("should create a character with valid input", async () => {
      const input = {
        name: "Test Dragon",
        speciesId: testSpeciesId,
        visibility: Visibility.PUBLIC,
      };

      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input },
        testToken,
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createCharacter).toMatchObject({
        name: input.name,
        speciesId: testSpeciesId,
        visibility: input.visibility,
        owner: {
          id: testUserId,
          username: expect.stringMatching(/^testuser_/),
        },
      });
    });

    it("should require authentication", async () => {
      const input = {
        name: "Unauthorized Character",
        speciesId: testSpeciesId,
      };

      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe("FORBIDDEN");
    });

    it("stores the name trimmed, and refuses one that is only spaces", async () => {
      // Names are typed back to confirm destructive actions (#430); a stored
      // stray space would make them unconfirmable.
      const trimmed = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: { name: "  Test Dragon \t", speciesId: testSpeciesId } },
        testToken,
      );
      expect(trimmed.body.errors).toBeUndefined();
      expect(trimmed.body.data.createCharacter.name).toBe("Test Dragon");

      const blank = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: { name: "   ", speciesId: testSpeciesId } },
        testToken,
      );
      expect(blank.body.errors).toBeDefined();
    });

    it("should validate required fields", async () => {
      // Empty name triggers @MinLength(1) class-validator error (HTTP 200 with errors)
      const input = {
        name: "",
        speciesId: testSpeciesId,
      };

      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input },
        testToken,
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
    });
  });

  /**
   * Staff creating a character owned by another member (#424). The form's
   * "Owned By..." picker used to send nothing about the member chosen, so the
   * character went to its creator.
   */
  describe("createCharacter with an owner", () => {
    let roleId: string;
    let memberId: string;

    beforeEach(async () => {
      const db = testApp.getDb();
      const membership = await db.communityMember.findFirstOrThrow({
        where: { userId: testUserId },
      });
      roleId = membership.roleId;

      const member = await testApp.createTestUser();
      memberId = member.id;
      await testApp.createTestCommunityMember(memberId, roleId);
    });

    const grantCreatingForOthers = () =>
      testApp.getDb().role.update({
        where: { id: roleId },
        data: { canCreateOrphanedCharacter: true },
      });

    it("gives the character to the member named, and records the change", async () => {
      await grantCreatingForOthers();

      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Made For Another",
            speciesId: testSpeciesId,
            ownerId: memberId,
          },
        },
        testToken,
      );

      expect(response.body.errors).toBeUndefined();
      const created = response.body.data.createCharacter;
      expect(created.owner.id).toBe(memberId);

      const changes = await testApp.getDb().characterOwnershipChange.findMany({
        where: { characterId: created.id },
      });
      expect(changes).toEqual([
        expect.objectContaining({ fromUserId: null, toUserId: memberId }),
      ]);
    });

    it("refuses without the permission to create for others", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Not Allowed",
            speciesId: testSpeciesId,
            ownerId: memberId,
          },
        },
        testToken,
      );

      expect(response.body.errors?.[0].message).toMatch(
        /permission to create characters for other members/i,
      );
    });

    it("refuses an owner from outside the community", async () => {
      await grantCreatingForOthers();
      const outsider = await testApp.createTestUser();

      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Outsider's",
            speciesId: testSpeciesId,
            ownerId: outsider.id,
          },
        },
        testToken,
      );

      expect(response.body.errors?.[0].message).toMatch(
        /owner must be a member of the species' community/i,
      );
    });

    it("refuses an owner alongside a pending owner", async () => {
      await grantCreatingForOthers();

      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Two Owners",
            speciesId: testSpeciesId,
            ownerId: memberId,
            pendingOwner: {
              provider: "DISCORD",
              providerAccountId: "123456789012345678",
            },
          },
        },
        testToken,
      );

      expect(response.body.errors?.[0].message).toMatch(
        /an owner cannot be combined with a pending owner/i,
      );
    });
  });

  describe("character query", () => {
    it("should fetch a public character", async () => {
      const createInput = {
        name: "Public Dragon",
        speciesId: testSpeciesId,
        visibility: Visibility.PUBLIC,
      };

      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: createInput },
        testToken,
      );

      expect(createResponse.body.errors).toBeUndefined();
      const characterId = createResponse.body.data.createCharacter.id;

      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId },
      );

      expect(fetchResponse.status).toBe(200);
      expect(fetchResponse.body.errors).toBeUndefined();
      expect(fetchResponse.body.data.character).toMatchObject({
        id: characterId,
        name: createInput.name,
        speciesId: testSpeciesId,
        visibility: createInput.visibility,
      });
    });

    it("should return error for non-existent character", async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: "non-existent-id" },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain("Character not found");
    });

    it("should block access to private characters for non-owners", async () => {
      const createInput = {
        name: "Private Dragon",
        speciesId: testSpeciesId,
        visibility: Visibility.PRIVATE,
      };

      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: createInput },
        testToken,
      );

      const characterId = createResponse.body.data.createCharacter.id;

      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId },
      );

      expect(fetchResponse.status).toBe(200);
      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain(
        "Character is private",
      );
    });
  });

  describe("characters query", () => {
    beforeEach(async () => {
      await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Public Dragon",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );

      await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Private Phoenix",
            speciesId: testSpeciesId,
            visibility: Visibility.PRIVATE,
          },
        },
        testToken,
      );
    });

    it("should fetch paginated characters", async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        {
          filters: {
            limit: 10,
            offset: 0,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.characters).toMatchObject({
        characters: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
    });

    it("should filter by name search", async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        {
          filters: {
            search: "Dragon",
            limit: 10,
            offset: 0,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      // Should only return characters with 'Dragon' in their name
      response.body.data.characters.characters.forEach(
        (char: { name: string }) => {
          expect(char.name).toContain("Dragon");
        },
      );
    });

    it("should respect visibility controls", async () => {
      const response = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        {
          filters: {
            limit: 50,
            offset: 0,
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();

      // Should not include private characters in public query
      const privateCharacters = response.body.data.characters.characters.filter(
        (char: { visibility: string }) =>
          char.visibility === Visibility.PRIVATE,
      );

      expect(privateCharacters).toHaveLength(0);

      // Should include public characters
      const publicCharacters = response.body.data.characters.characters.filter(
        (char: { visibility: string }) => char.visibility === Visibility.PUBLIC,
      );

      expect(publicCharacters.length).toBeGreaterThan(0);
    });
  });

  describe("updateCharacterProfile", () => {
    it("should update character when user is owner", async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Original Name",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );

      const characterId = createResponse.body.data.createCharacter.id;

      const updateResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation updateCharacterProfile($id: ID!, $input: UpdateCharacterProfileInput!) {
            updateCharacterProfile(id: $id, input: $input) {
              id
              name
            }
          }
        `,
        {
          id: characterId,
          input: {
            name: "Updated Name",
          },
        },
        testToken,
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.errors).toBeUndefined();
      expect(updateResponse.body.data.updateCharacterProfile).toMatchObject({
        id: characterId,
        name: "Updated Name",
      });
    });

    it("records staff leaving a character with no owner as a change to the community", async () => {
      const db = testApp.getDb();
      const membership = await db.communityMember.findFirstOrThrow({
        where: { userId: testUserId },
      });
      await db.role.update({
        where: { id: membership.roleId },
        data: { canCreateOrphanedCharacter: true },
      });
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: { name: "Orphaned By Staff", speciesId: testSpeciesId } },
        testToken,
      );
      const characterId = createResponse.body.data.createCharacter.id;

      const response = await testApp.authenticatedGraphqlRequest(
        `mutation updateCharacterProfile($id: ID!, $input: UpdateCharacterProfileInput!) {
          updateCharacterProfile(id: $id, input: $input) { id }
        }`,
        { id: characterId, input: { ownerIdUpdate: { set: null } } },
        testToken,
      );

      expect(response.body.errors).toBeUndefined();
      const changes = await db.characterOwnershipChange.findMany({
        where: { characterId },
        orderBy: { createdAt: "asc" },
      });
      expect(changes.at(-1)).toEqual(
        expect.objectContaining({ fromUserId: testUserId, toUserId: null }),
      );
    });
  });

  describe("kickCharacterFromSpecies", () => {
    it("should remove the character from its species and return true", async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "To Kick",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );

      const characterId = createResponse.body.data.createCharacter.id;

      const kickResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation kickCharacterFromSpecies($id: ID!) {
            kickCharacterFromSpecies(id: $id)
          }
        `,
        { id: characterId },
        testToken,
      );

      expect(kickResponse.status).toBe(200);
      expect(kickResponse.body.errors).toBeUndefined();
      expect(kickResponse.body.data.kickCharacterFromSpecies).toBe(true);

      const fetchResponse = await testApp.authenticatedGraphqlRequest(
        `
          query character($id: ID!) {
            character(id: $id) {
              id
              speciesId
              customFields
            }
          }
        `,
        { id: characterId },
        testToken,
      );

      expect(fetchResponse.body.errors).toBeUndefined();
      const updated = fetchResponse.body.data.character;
      expect(updated.speciesId).toBeNull();
      expect(JSON.parse(updated.customFields ?? "{}")).toEqual({});
    });

    it("should return forbidden when the character has no species (no community context to resolve)", async () => {
      // Create a character, kick it once, then try again.
      // After kicking, speciesId is null so the community resolver can't find a
      // community for the character — the guard denies before the service runs.
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Already Kicked",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );

      const characterId = createResponse.body.data.createCharacter.id;

      await testApp.authenticatedGraphqlRequest(
        `mutation kickCharacterFromSpecies($id: ID!) { kickCharacterFromSpecies(id: $id) }`,
        { id: characterId },
        testToken,
      );

      const secondKick = await testApp.authenticatedGraphqlRequest(
        `mutation kickCharacterFromSpecies($id: ID!) { kickCharacterFromSpecies(id: $id) }`,
        { id: characterId },
        testToken,
      );

      expect(secondKick.body.errors).toBeDefined();
      expect(secondKick.body.errors[0].message).toContain("Forbidden");
    });
  });

  /**
   * An owner handing a character to its community (#521), so staff can put it
   * in a prize pool or give it out like any other ownerless character.
   */
  describe("giveCharacterToCommunity", () => {
    const GIVE = `mutation give($id: ID!) { giveCharacterToCommunity(id: $id) }`;

    const createOwned = async (visibility: Visibility = Visibility.PUBLIC) => {
      const response = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: { name: "Donation", speciesId: testSpeciesId, visibility } },
        testToken,
      );
      return response.body.data.createCharacter.id as string;
    };

    it("leaves the character with no owner, makes it public, and records the change", async () => {
      const characterId = await createOwned(Visibility.PRIVATE);

      const response = await testApp.authenticatedGraphqlRequest(
        GIVE,
        { id: characterId },
        testToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.giveCharacterToCommunity).toBe(true);

      const db = testApp.getDb();
      const character = await db.character.findUniqueOrThrow({
        where: { id: characterId },
      });
      expect(character.ownerId).toBeNull();
      expect(character.visibility).toBe(Visibility.PUBLIC);

      const changes = await db.characterOwnershipChange.findMany({
        where: { characterId },
        orderBy: { createdAt: "asc" },
      });
      expect(changes.at(-1)).toEqual(
        expect.objectContaining({ fromUserId: testUserId, toUserId: null }),
      );
    });

    it("refuses anyone but the owner", async () => {
      const characterId = await createOwned();
      const other = await testApp.createTestUser();
      const otherToken = await testApp.generateTestToken(
        other.id,
        other.username,
      );

      const response = await testApp.authenticatedGraphqlRequest(
        GIVE,
        { id: characterId },
        otherToken,
      );

      expect(response.body.errors).toBeDefined();
      const character = await testApp
        .getDb()
        .character.findUniqueOrThrow({ where: { id: characterId } });
      expect(character.ownerId).toBe(testUserId);
    });

    it("refuses a character with no species, which has no community to go to", async () => {
      const character = await testApp.getDb().character.create({
        data: {
          name: "Speciesless",
          ownerId: testUserId,
          creatorId: testUserId,
        },
      });

      const response = await testApp.authenticatedGraphqlRequest(
        GIVE,
        { id: character.id },
        testToken,
      );

      expect(response.body.errors).toBeDefined();
      const after = await testApp
        .getDb()
        .character.findUniqueOrThrow({ where: { id: character.id } });
      expect(after.ownerId).toBe(testUserId);
    });

    it("refuses a deleted character", async () => {
      const characterId = await createOwned();
      await testApp.getDb().character.update({
        where: { id: characterId },
        data: { deletedAt: new Date() },
      });

      const response = await testApp.authenticatedGraphqlRequest(
        GIVE,
        { id: characterId },
        testToken,
      );

      expect(response.body.errors).toBeDefined();
      const after = await testApp
        .getDb()
        .character.findUniqueOrThrow({ where: { id: characterId } });
      expect(after.ownerId).toBe(testUserId);
    });
  });

  describe("deleteCharacter", () => {
    it("should delete character when user has canDeleteCharacter permission", async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "To Delete",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );

      const characterId = createResponse.body.data.createCharacter.id;

      const deleteResponse = await testApp.authenticatedGraphqlRequest(
        `
          mutation deleteCharacter($id: ID!) {
            deleteCharacter(id: $id)
          }
        `,
        { id: characterId },
        testToken,
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.errors).toBeUndefined();
      expect(deleteResponse.body.data.deleteCharacter).toBe(true);

      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId },
      );

      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain(
        "Character not found",
      );
    });

    it("should return forbidden when user lacks canDeleteCharacter permission", async () => {
      // Create a character owned by the privileged user
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Cannot Delete This",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const characterId = createResponse.body.data.createCharacter.id;

      // Create a second user with a role that explicitly lacks canDeleteCharacter
      const unprivilegedUser = await testApp.createTestUser();
      const { communityId } =
        await testApp.createTestCommunitySetup(testUserId);
      const readOnlyRole = await testApp.createTestRole(communityId, {
        canCreateCharacter: false,
        canDeleteCharacter: false,
      });
      await testApp.createTestCommunityMember(
        unprivilegedUser.id,
        readOnlyRole.id,
      );
      const unprivilegedToken = await testApp.generateTestToken(
        unprivilegedUser.id,
        unprivilegedUser.username,
      );

      const deleteResponse = await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: characterId },
        unprivilegedToken,
      );

      expect(deleteResponse.body.errors).toBeDefined();
      expect(deleteResponse.body.errors[0].message).toContain("Forbidden");
    });

    it("requires a global admin once a character has been kicked from its species", async () => {
      // Intentional, not a gap: deleteCharacter resolves the community via
      // @ResolveCommunityFrom({ characterId }), and getCharacterCommunity
      // returns null for a speciesless character. kickCharacterFromSpecies
      // produces exactly that, so once a character leaves its species no
      // community permission can reach it and deletion is site-admin only.
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        { input: { name: "Kicked Then Deleted", speciesId: testSpeciesId } },
        testToken,
      );
      const characterId = createResponse.body.data.createCharacter.id;

      await testApp.authenticatedGraphqlRequest(
        `mutation kick($id: ID!) { kickCharacterFromSpecies(id: $id) }`,
        { id: characterId },
        testToken,
      );

      // The same community moderator who could delete it a moment ago cannot now.
      const deniedResponse = await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: characterId },
        testToken,
      );
      expect(deniedResponse.body.errors).toBeDefined();

      // A global admin still can.
      const admin = await testApp.createTestUser({ isAdmin: true });
      const adminToken = await testApp.generateTestToken(
        admin.id,
        admin.username,
      );
      const adminResponse = await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: characterId },
        adminToken,
      );
      expect(adminResponse.body.errors).toBeUndefined();
      expect(adminResponse.body.data.deleteCharacter).toBe(true);
    });
  });

  describe("purgeCharacter", () => {
    it("should permanently delete a character when called by a global admin", async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "To Purge",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const characterId = createResponse.body.data.createCharacter.id;

      const adminUser = await testApp.createTestUser({ isAdmin: true });
      const adminToken = await testApp.generateTestToken(
        adminUser.id,
        adminUser.username,
      );

      const purgeResponse = await testApp.authenticatedGraphqlRequest(
        `mutation purgeCharacter($id: ID!) { purgeCharacter(id: $id) }`,
        { id: characterId },
        adminToken,
      );

      expect(purgeResponse.status).toBe(200);
      expect(purgeResponse.body.errors).toBeUndefined();
      expect(purgeResponse.body.data.purgeCharacter).toBe(true);

      // Character should be gone — not just hidden, but absent from the DB
      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId },
      );
      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain(
        "Character not found",
      );
    });

    it("should return forbidden when called by a non-admin user", async () => {
      const createResponse = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Cannot Purge This",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const characterId = createResponse.body.data.createCharacter.id;

      const purgeResponse = await testApp.authenticatedGraphqlRequest(
        `mutation purgeCharacter($id: ID!) { purgeCharacter(id: $id) }`,
        { id: characterId },
        testToken,
      );

      expect(purgeResponse.body.errors).toBeDefined();
      expect(purgeResponse.body.errors[0].message).toContain("Forbidden");
    });
  });

  describe("soft-deleted character isolation", () => {
    it("should exclude soft-deleted characters from the characters list", async () => {
      // Create two characters, delete one, confirm only the live one is returned
      await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Live Dragon",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const toDeleteRes = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Deleted Dragon",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const deletedId = toDeleteRes.body.data.createCharacter.id;

      await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: deletedId },
        testToken,
      );

      const listResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTERS,
        { filters: { limit: 50, offset: 0 } },
      );

      expect(listResponse.body.errors).toBeUndefined();
      const ids = listResponse.body.data.characters.characters.map(
        (c: { id: string }) => c.id,
      );
      expect(ids).not.toContain(deletedId);
    });

    it("should return not-found for a soft-deleted character by id", async () => {
      const createRes = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Soon Gone",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const characterId = createRes.body.data.createCharacter.id;

      await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: characterId },
        testToken,
      );

      const fetchResponse = await testApp.graphqlRequest(
        CHARACTER_QUERIES.GET_CHARACTER,
        { id: characterId },
      );

      expect(fetchResponse.body.errors).toBeDefined();
      expect(fetchResponse.body.errors[0].message).toContain(
        "Character not found",
      );
    });

    it("should reject updateCharacterProfile for a soft-deleted character", async () => {
      const createRes = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "To Be Locked",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const characterId = createRes.body.data.createCharacter.id;

      await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: characterId },
        testToken,
      );

      const updateResponse = await testApp.authenticatedGraphqlRequest(
        `mutation updateCharacterProfile($id: ID!, $input: UpdateCharacterProfileInput!) {
          updateCharacterProfile(id: $id, input: $input) { id name }
        }`,
        { id: characterId, input: { name: "Should Not Work" } },
        testToken,
      );

      expect(updateResponse.body.errors).toBeDefined();
      expect(updateResponse.body.errors[0].extensions.code).toBe("FORBIDDEN");
    });

    it("should reject kickCharacterFromSpecies for a soft-deleted character", async () => {
      const createRes = await testApp.authenticatedGraphqlRequest(
        CHARACTER_QUERIES.CREATE_CHARACTER,
        {
          input: {
            name: "Deleted With Species",
            speciesId: testSpeciesId,
            visibility: Visibility.PUBLIC,
          },
        },
        testToken,
      );
      const characterId = createRes.body.data.createCharacter.id;

      await testApp.authenticatedGraphqlRequest(
        `mutation deleteCharacter($id: ID!) { deleteCharacter(id: $id) }`,
        { id: characterId },
        testToken,
      );

      const kickResponse = await testApp.authenticatedGraphqlRequest(
        `mutation kickCharacterFromSpecies($id: ID!) { kickCharacterFromSpecies(id: $id) }`,
        { id: characterId },
        testToken,
      );

      expect(kickResponse.body.errors).toBeDefined();
      expect(kickResponse.body.errors[0].message).toContain("Forbidden");
    });
  });
});
