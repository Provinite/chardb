import { TestApp } from "../../test/setup-e2e";
import { UsersModule } from "./users.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ModerationStatus } from "@chardb/database";

/**
 * Who may become an avatar, asserted at the API.
 *
 * Two gates guard the column, at two different moments, and this file exists
 * because only one of them is visible in the UI. The write refuses an image
 * that is not yours; the read refuses to serve one moderation has not cleared.
 * Neither is enforced by hiding a control, so both have to hold against a
 * client that calls the mutation directly.
 *
 * The read gate needs its own cases because it is the one that keeps holding
 * after the write: an image approved when it was chosen can be rejected the
 * next day, and nothing goes back to clear `avatarImageId`.
 */
const UPDATE_PROFILE = `
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      avatarImage {
        id
      }
      avatarImageModerationStatus
    }
  }
`;

const ME = `
  query Me {
    me {
      id
      avatarImage {
        id
      }
      avatarImageModerationStatus
    }
  }
`;

const PUBLIC_USER = `
  query User($username: String!) {
    user(username: $username) {
      id
      avatarImage {
        id
      }
    }
  }
`;

describe("UsersResolver avatars (e2e)", () => {
  let testApp: TestApp;
  let ownerId: string;
  let ownerUsername: string;
  let ownerToken: string;
  let strangerId: string;

  /** An image belonging to `uploaderId`, at whatever moderation status. */
  const createImage = async (
    uploaderId: string,
    moderationStatus: ModerationStatus,
  ) => {
    const image = await testApp.getDb().image.create({
      data: {
        filename: "avatar.png",
        originalFilename: "avatar.png",
        originalUrl: "https://cdn.test/avatar/original.png",
        thumbnailUrl: "https://cdn.test/avatar/thumbnail.png",
        uploaderId,
        width: 600,
        height: 900,
        fileSize: 4321,
        mimeType: "image/png",
        moderationStatus,
      },
    });
    return image.id;
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, UsersModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();

    const owner = await testApp.createTestUser();
    ownerId = owner.id;
    ownerUsername = owner.username;
    ownerToken = await testApp.generateTestToken(ownerId);

    const stranger = await testApp.createTestUser();
    strangerId = stranger.id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("setting one", () => {
    it("accepts an approved image the caller uploaded", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.APPROVED);

      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: imageId } },
        ownerToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateProfile.avatarImage).toEqual({
        id: imageId,
      });
    });

    /**
     * The case the upload path depends on. A picture is PENDING the instant it
     * is uploaded, so refusing PENDING here would mean the avatar uploader
     * could never set the thing it had just uploaded -- the reference is
     * stored and the read gate below withholds the picture until it clears.
     */
    it("accepts a pending image, and withholds it until approval", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.PENDING);

      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: imageId } },
        ownerToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateProfile).toMatchObject({
        avatarImage: null,
        avatarImageModerationStatus: "PENDING",
      });

      const stored = await testApp
        .getDb()
        .user.findUnique({ where: { id: ownerId } });
      expect(stored?.avatarImageId).toBe(imageId);
    });

    it("refuses an image somebody else uploaded", async () => {
      const imageId = await createImage(strangerId, ModerationStatus.APPROVED);

      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: imageId } },
        ownerToken,
      );

      expect(response.body.errors).toBeDefined();

      const stored = await testApp
        .getDb()
        .user.findUnique({ where: { id: ownerId } });
      expect(stored?.avatarImageId).toBeNull();
    });

    it("refuses an image that does not exist", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: "3f1d2c4b-0000-4000-8000-000000000000" } },
        ownerToken,
      );

      expect(response.body.errors).toBeDefined();
    });

    it("refuses an image moderation has rejected", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.REJECTED);

      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: imageId } },
        ownerToken,
      );

      expect(response.body.errors).toBeDefined();

      const stored = await testApp
        .getDb()
        .user.findUnique({ where: { id: ownerId } });
      expect(stored?.avatarImageId).toBeNull();
    });
  });

  describe("clearing one", () => {
    it("removes the avatar on an explicit null", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.APPROVED);
      await testApp.getDb().user.update({
        where: { id: ownerId },
        data: { avatarImageId: imageId },
      });

      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: null } },
        ownerToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateProfile.avatarImage).toBeNull();

      const stored = await testApp
        .getDb()
        .user.findUnique({ where: { id: ownerId } });
      expect(stored?.avatarImageId).toBeNull();
    });

    /**
     * The other half of that contract, and the one that would go unnoticed:
     * every other field on this input treats "not sent" as "leave alone", and
     * an avatar that quietly cleared itself whenever somebody edited their bio
     * would look like the save having eaten it.
     */
    it("leaves the avatar alone when the field is not sent", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.APPROVED);
      await testApp.getDb().user.update({
        where: { id: ownerId },
        data: { avatarImageId: imageId },
      });

      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { bio: "Unrelated edit" } },
        ownerToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateProfile.avatarImage).toEqual({
        id: imageId,
      });
    });
  });

  describe("serving one", () => {
    it("withholds an avatar rejected after it was chosen", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.APPROVED);
      await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: imageId } },
        ownerToken,
      );

      // What `rejectImage` does, without pulling the moderation module in.
      await testApp.getDb().image.update({
        where: { id: imageId },
        data: { moderationStatus: ModerationStatus.REJECTED },
      });

      const response = await testApp.authenticatedGraphqlRequest(
        ME,
        {},
        ownerToken,
      );

      expect(response.body.data.me).toMatchObject({
        avatarImage: null,
        avatarImageModerationStatus: "REJECTED",
      });
    });

    it("serves an approved avatar to a visitor", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.APPROVED);
      await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: imageId } },
        ownerToken,
      );

      const response = await testApp.graphqlRequest(PUBLIC_USER, {
        username: ownerUsername,
      });

      expect(response.body.data.user.avatarImage).toEqual({ id: imageId });
    });

    it("withholds a pending avatar from a visitor", async () => {
      const imageId = await createImage(ownerId, ModerationStatus.PENDING);
      await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: imageId } },
        ownerToken,
      );

      const response = await testApp.graphqlRequest(PUBLIC_USER, {
        username: ownerUsername,
      });

      expect(response.body.data.user.avatarImage).toBeNull();
    });

    /**
     * `avatarImageModerationStatus` is owner-only (`@AllowSelf`), and that is
     * deliberately NOT asserted here.
     *
     * This harness does not enforce field-resolver guards on `User` at all:
     * ask it for a stranger's `email` -- guarded the same way since long
     * before avatars, and masked to "" in production -- and it hands back the
     * real address. So an assertion here would pass or fail for reasons that
     * have nothing to do with this field, and a green one would be the
     * dangerous outcome. The gate is real; it is checked against a running
     * server, where a stranger reading this field gets null.
     *
     * Worth fixing in the harness, but not from here: it would change what
     * every `*.e2e.spec.ts` in the app is testing.
     */
  });
});
