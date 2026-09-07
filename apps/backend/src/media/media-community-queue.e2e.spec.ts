import { TestApp } from "../../test/setup-e2e";
import { MediaService } from "./media.service";
import { MediaModule } from "./media.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { CommunityResolverService } from "../auth/services/community-resolver.service";
import { ModerationStatus, Visibility } from "@chardb/database";

/**
 * A community's moderation queue, for uploads that have no character.
 *
 * Everything here used to resolve its community through
 * `character -> species -> community` and through nothing else, so a gallery
 * picture or a user avatar belonged to no community, appeared in no
 * community's queue, and sat PENDING -- which means URL-masked, which means
 * invisible -- until a site admin happened to work through the global queue.
 * `Media.communityId` is the second route, and these are the assertions that
 * it is actually read.
 *
 * The negative cases carry as much weight as the positive ones: a widened
 * filter that returns another community's uploads would be a worse bug than
 * the one being fixed, because it puts strangers' pictures in front of
 * moderators who can reject them.
 */
describe("community moderation queue, characterless uploads (e2e)", () => {
  let testApp: TestApp;
  let mediaService: MediaService;
  let communityResolver: CommunityResolverService;

  let uploaderId: string;
  let communityId: string;
  let speciesId: string;
  let otherCommunityId: string;

  /** A PENDING image owned by the uploader. */
  const createPendingImage = async () => {
    const image = await testApp.getDb().image.create({
      data: {
        filename: "pending.png",
        originalFilename: "pending.png",
        originalUrl: "https://cdn.test/pending/original.png",
        uploaderId,
        width: 100,
        height: 100,
        fileSize: 999,
        mimeType: "image/png",
        moderationStatus: ModerationStatus.PENDING,
      },
    });
    return image.id;
  };

  const createMedia = async (data: {
    title: string;
    characterId?: string;
    communityId?: string;
  }) => {
    const imageId = await createPendingImage();
    const media = await testApp.getDb().media.create({
      data: {
        title: data.title,
        ownerId: uploaderId,
        imageId,
        characterId: data.characterId ?? null,
        communityId: data.communityId ?? null,
        visibility: Visibility.PUBLIC,
      },
    });
    return media.id;
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, MediaModule],
    });
    mediaService = testApp.getModuleRef().get(MediaService);
    communityResolver = testApp
      .getModuleRef()
      .get(CommunityResolverService, { strict: false });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();

    const uploader = await testApp.createTestUser();
    uploaderId = uploader.id;

    const setup = await testApp.createTestCommunitySetup(uploaderId);
    communityId = setup.communityId;
    speciesId = setup.speciesId;

    const other = await testApp.createTestCommunity("Somewhere Else");
    otherCommunityId = other.id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("findPendingForModeration", () => {
    it("includes an upload that names this community directly", async () => {
      const mediaId = await createMedia({ title: "An avatar", communityId });

      const queue = await mediaService.findPendingForModeration(communityId);

      expect(queue.media.map((row) => row.id)).toContain(mediaId);
      expect(queue.total).toBe(1);
    });

    it("still includes an upload that reaches it through a character", async () => {
      const character = await testApp.getDb().character.create({
        data: { name: "Someone", ownerId: uploaderId, speciesId },
      });
      const mediaId = await createMedia({
        title: "Character art",
        characterId: character.id,
      });

      const queue = await mediaService.findPendingForModeration(communityId);

      expect(queue.media.map((row) => row.id)).toContain(mediaId);
    });

    it("excludes an upload that names a different community", async () => {
      await createMedia({
        title: "Not yours",
        communityId: otherCommunityId,
      });

      const queue = await mediaService.findPendingForModeration(communityId);

      expect(queue.media).toHaveLength(0);
      expect(queue.total).toBe(0);
    });

    /**
     * An upload made at the apex names no community, and no community should
     * be handed it. It stays in the global queue, which is the pre-existing
     * behaviour for everything characterless and remains correct.
     */
    it("excludes an upload that names no community at all", async () => {
      await createMedia({ title: "Apex upload" });

      const queue = await mediaService.findPendingForModeration(communityId);

      expect(queue.media).toHaveLength(0);
    });

    it("counts exactly what it lists", async () => {
      await createMedia({ title: "An avatar", communityId });
      await createMedia({ title: "Not yours", communityId: otherCommunityId });
      await createMedia({ title: "Apex upload" });

      const queue = await mediaService.findPendingForModeration(communityId);
      const count = await mediaService.getPendingModerationCount(communityId);

      expect(count).toBe(queue.total);
      expect(count).toBe(1);
    });
  });

  describe("resolving a media's community", () => {
    it("reads it off the column when there is no character", async () => {
      const mediaId = await createMedia({ title: "An avatar", communityId });

      await expect(communityResolver.getMediaCommunity(mediaId)).resolves.toBe(
        communityId,
      );
    });

    /**
     * The character wins, and this is the case that says why the order is
     * that way round rather than the other: the column was written once at
     * upload and a character can be moved afterwards.
     */
    it("prefers the character's community over a stale column", async () => {
      const character = await testApp.getDb().character.create({
        data: { name: "Someone", ownerId: uploaderId, speciesId },
      });
      const mediaId = await createMedia({
        title: "Character art",
        characterId: character.id,
        communityId: otherCommunityId,
      });

      await expect(communityResolver.getMediaCommunity(mediaId)).resolves.toBe(
        communityId,
      );
    });

    it("is null for an upload that names neither", async () => {
      const mediaId = await createMedia({ title: "Apex upload" });

      await expect(
        communityResolver.getMediaCommunity(mediaId),
      ).resolves.toBeNull();
    });
  });
});
