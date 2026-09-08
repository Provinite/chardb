import { TestApp } from "../../test/setup-e2e";
import { MediaService } from "./media.service";
import { MediaModule } from "./media.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ModerationStatus, Visibility } from "@chardb/database";

/**
 * Deleting the media row behind an avatar.
 *
 * Uploading an avatar creates a Media row like any other upload, and that row
 * is visible to its owner in their own media library -- so deleting it is a
 * thing someone can do, by hand, without realising it is the picture on their
 * profile.
 *
 * `cleanupOrphanedImage` already counted `user.avatarImageId` among the
 * references that keep an image alive, but nothing could set an avatar until
 * now, so that branch has never been reachable. These are the assertions that
 * it works.
 */
describe("deleting the media behind an avatar (e2e)", () => {
  let testApp: TestApp;
  let mediaService: MediaService;
  let ownerId: string;

  const createAvatarMedia = async (status: ModerationStatus) => {
    const image = await testApp.getDb().image.create({
      data: {
        filename: "avatar.png",
        originalFilename: "avatar.png",
        originalUrl: "https://cdn.test/avatar/original.png",
        mediumUrl: "https://cdn.test/avatar/medium.png",
        thumbnailUrl: "https://cdn.test/avatar/thumbnail.png",
        uploaderId: ownerId,
        width: 600,
        height: 900,
        fileSize: 4321,
        mimeType: "image/png",
        moderationStatus: status,
      },
    });

    const media = await testApp.getDb().media.create({
      data: {
        title: "Someone's avatar",
        ownerId,
        imageId: image.id,
        visibility: Visibility.PRIVATE,
      },
    });

    await testApp.getDb().user.update({
      where: { id: ownerId },
      data: { avatarImageId: image.id },
    });

    return { imageId: image.id, mediaId: media.id };
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, MediaModule],
    });
    mediaService = testApp.getModuleRef().get(MediaService);
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    const owner = await testApp.createTestUser();
    ownerId = owner.id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it("keeps the image, so the avatar survives", async () => {
    const { imageId, mediaId } = await createAvatarMedia(
      ModerationStatus.APPROVED,
    );

    await mediaService.remove(mediaId, ownerId);

    // The media is gone...
    await expect(
      testApp.getDb().media.findUnique({ where: { id: mediaId } }),
    ).resolves.toBeNull();

    // ...and the image is not, because the avatar still points at it.
    await expect(
      testApp.getDb().image.findUnique({ where: { id: imageId } }),
    ).resolves.not.toBeNull();

    const owner = await testApp
      .getDb()
      .user.findUnique({ where: { id: ownerId } });
    expect(owner?.avatarImageId).toBe(imageId);
  });

  it("removes the image once it is nobody's avatar either", async () => {
    const { imageId, mediaId } = await createAvatarMedia(
      ModerationStatus.APPROVED,
    );

    await testApp.getDb().user.update({
      where: { id: ownerId },
      data: { avatarImageId: null },
    });
    await mediaService.remove(mediaId, ownerId);

    await expect(
      testApp.getDb().image.findUnique({ where: { id: imageId } }),
    ).resolves.toBeNull();
  });

  /**
   * The consequence worth knowing about rather than the one worth fixing.
   *
   * Both community queues reach an image through a media row, so a pending
   * avatar whose media has been deleted leaves every community queue. It is
   * still in the global one -- `getGlobalQueue` reads `images` directly -- so
   * a site admin can still approve it and nothing is stranded permanently.
   */
  it("leaves the community queue when the media goes, but not the global one", async () => {
    const community = await testApp.createTestCommunity();
    const { imageId, mediaId } = await createAvatarMedia(
      ModerationStatus.PENDING,
    );
    await testApp.getDb().media.update({
      where: { id: mediaId },
      data: { communityId: community.id },
    });

    const before = await mediaService.findPendingForModeration(community.id);
    expect(before.media.map((row) => row.id)).toContain(mediaId);

    await mediaService.remove(mediaId, ownerId);

    const after = await mediaService.findPendingForModeration(community.id);
    expect(after.media).toHaveLength(0);

    // Still reachable by a site admin. `getGlobalQueue` filters on nothing but
    // `moderationStatus: PENDING` -- no media join -- so being pending and
    // being in that queue are the same statement, and this asserts it the way
    // the queue asks it rather than by reading the row.
    const globalQueue = await testApp.getDb().image.findMany({
      where: { moderationStatus: ModerationStatus.PENDING },
      select: { id: true },
    });
    expect(globalQueue.map((row) => row.id)).toContain(imageId);
  });
});
