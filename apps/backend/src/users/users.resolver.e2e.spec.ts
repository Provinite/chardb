import { TestApp } from "../../test/setup-e2e";
import { UsersModule } from "./users.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ModerationStatus } from "@chardb/database";

/**
 * Avatars at the API, since #410.
 *
 * An avatar is set only by uploading one (`POST /images/avatar`, see
 * `avatar-upload.e2e.spec.ts`); `updateProfile` can only take it away. What
 * keeps an unmoderated picture from appearing anywhere but a profile is that
 * nothing else can point at one, and what keeps a moderated picture that is
 * pending or rejected from appearing as an avatar is that `avatarImage`
 * serves only avatar uploads and approved images. Both have to hold against a
 * client that calls the API directly.
 */
const UPDATE_PROFILE = `
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      avatarImage {
        id
      }
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

  /** An image the owner uploaded. */
  const createImage = async (
    moderationStatus: ModerationStatus,
    isAvatarUpload: boolean,
  ) => {
    const image = await testApp.getDb().image.create({
      data: {
        filename: "avatar.png",
        originalFilename: "avatar.png",
        originalUrl: "https://cdn.test/avatar/original.png",
        thumbnailUrl: "https://cdn.test/avatar/thumbnail.png",
        uploaderId: ownerId,
        width: 600,
        height: 900,
        fileSize: 4321,
        mimeType: "image/png",
        moderationStatus,
        isAvatarUpload,
      },
    });
    return image.id;
  };

  /** What `POST /images/avatar` leaves behind. */
  const createAvatar = async () => {
    const imageId = await createImage(ModerationStatus.APPROVED, true);
    await testApp.getDb().user.update({
      where: { id: ownerId },
      data: { avatarImageId: imageId },
    });
    return imageId;
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
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("setting one", () => {
    /**
     * Even an image that is already an avatar upload of yours. The upload is
     * the only way in, so that an image chosen here can never be one that
     * moderation is still looking at, or one that skipped it.
     */
    it("refuses any image id", async () => {
      const imageId = await createImage(ModerationStatus.APPROVED, true);

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
      await createAvatar();

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
     * Every other field on this input treats "not sent" as "leave alone", and
     * an avatar that quietly cleared itself whenever somebody edited their bio
     * would look like the save having eaten it.
     */
    it("leaves the avatar alone when the field is not sent", async () => {
      const imageId = await createAvatar();

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

    it("deletes the removed avatar's image", async () => {
      const imageId = await createAvatar();

      await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: null } },
        ownerToken,
      );

      await expect(
        testApp.getDb().image.findUnique({ where: { id: imageId } }),
      ).resolves.toBeNull();
    });

    /**
     * An avatar set before #410 can still be a post in its owner's library,
     * and is not rubbish just because it stopped being their avatar.
     */
    it("keeps a removed avatar's image that some media still shows", async () => {
      const imageId = await createAvatar();
      await testApp.getDb().media.create({
        data: { title: "Real artwork", ownerId, imageId },
      });

      await testApp.authenticatedGraphqlRequest(
        UPDATE_PROFILE,
        { input: { avatarImageId: null } },
        ownerToken,
      );

      await expect(
        testApp.getDb().image.findUnique({ where: { id: imageId } }),
      ).resolves.not.toBeNull();
    });
  });

  describe("serving one", () => {
    it("serves an avatar upload to a visitor straight away", async () => {
      const imageId = await createAvatar();

      const response = await testApp.graphqlRequest(PUBLIC_USER, {
        username: ownerUsername,
      });

      expect(response.body.data.user.avatarImage).toEqual({ id: imageId });
    });

    /**
     * An avatar chosen before #410 could be any approved image of yours, and
     * those stay where they are.
     */
    it("serves an approved image that is not an avatar upload", async () => {
      const imageId = await createImage(ModerationStatus.APPROVED, false);
      await testApp.getDb().user.update({
        where: { id: ownerId },
        data: { avatarImageId: imageId },
      });

      const response = await testApp.graphqlRequest(PUBLIC_USER, {
        username: ownerUsername,
      });

      expect(response.body.data.user.avatarImage).toEqual({ id: imageId });
    });

    /**
     * The gate that keeps moderation meaning something for everything that
     * is not an avatar: a picture a moderator has not cleared, or has
     * rejected, never reaches anyone as a profile picture.
     */
    it.each([ModerationStatus.PENDING, ModerationStatus.REJECTED])(
      "withholds a %s image that is not an avatar upload",
      async (status) => {
        const imageId = await createImage(status, false);
        await testApp.getDb().user.update({
          where: { id: ownerId },
          data: { avatarImageId: imageId },
        });

        const response = await testApp.graphqlRequest(PUBLIC_USER, {
          username: ownerUsername,
        });

        expect(response.body.data.user.avatarImage).toBeNull();
      },
    );
  });
});
