import { TestApp } from "../../test/setup-e2e";
import { MediaService } from "./media.service";
import { MediaModule } from "./media.module";
import { GalleriesService } from "../galleries/galleries.service";
import { GalleriesModule } from "../galleries/galleries.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { NotFoundException } from "@nestjs/common";
import { Visibility } from "@chardb/database";

/**
 * A community host shows the site prefiltered to that community: its media
 * and galleries in listings, and a 404 for one from somewhere else.
 */
describe("media and galleries scoped to a community (e2e)", () => {
  let testApp: TestApp;
  let mediaService: MediaService;
  let galleriesService: GalleriesService;

  let ownerId: string;
  let communityId: string;
  let otherCommunityId: string;
  let characterId: string;
  let otherCharacterId: string;

  const createMedia = async (data: {
    title: string;
    characterId?: string;
    communityId?: string;
  }) => {
    const media = await testApp.getDb().media.create({
      data: {
        title: data.title,
        ownerId,
        characterId: data.characterId ?? null,
        communityId: data.communityId ?? null,
        visibility: Visibility.PUBLIC,
      },
    });
    return media.id;
  };

  const createGallery = async (name: string, characterId?: string) => {
    const gallery = await testApp.getDb().gallery.create({
      data: {
        name,
        ownerId,
        characterId: characterId ?? null,
        visibility: Visibility.PUBLIC,
      },
    });
    return gallery.id;
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, MediaModule, GalleriesModule],
    });
    mediaService = testApp.getModuleRef().get(MediaService);
    galleriesService = testApp.getModuleRef().get(GalleriesService);
  });

  beforeEach(async () => {
    await testApp.clearDatabase();

    const owner = await testApp.createTestUser();
    ownerId = owner.id;

    const setup = await testApp.createTestCommunitySetup(ownerId);
    communityId = setup.communityId;

    const other = await testApp.createTestCommunity("Somewhere Else");
    otherCommunityId = other.id;
    const otherSpecies = await testApp.getDb().species.create({
      data: { name: "Other Species", communityId: otherCommunityId },
    });

    characterId = (
      await testApp.getDb().character.create({
        data: { name: "Here", ownerId, speciesId: setup.speciesId },
      })
    ).id;
    otherCharacterId = (
      await testApp.getDb().character.create({
        data: { name: "There", ownerId, speciesId: otherSpecies.id },
      })
    ).id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("media", () => {
    it("lists media reaching the community by character or by upload", async () => {
      const viaCharacter = await createMedia({ title: "Art", characterId });
      const viaUpload = await createMedia({ title: "Upload", communityId });
      await createMedia({ title: "Elsewhere", characterId: otherCharacterId });
      await createMedia({ title: "Apex" });

      const result = await mediaService.findAll({ communityId });

      expect(result.media.map((m) => m.id).sort()).toEqual(
        [viaCharacter, viaUpload].sort(),
      );
      expect(result.total).toBe(2);
    });

    it("lists everything without a community", async () => {
      await createMedia({ title: "Art", characterId });
      await createMedia({ title: "Elsewhere", characterId: otherCharacterId });

      const result = await mediaService.findAll({});

      expect(result.total).toBe(2);
    });

    it("finds one item in its own community", async () => {
      const id = await createMedia({ title: "Art", characterId });

      await expect(
        mediaService.findOne(id, undefined, communityId),
      ).resolves.toMatchObject({ id });
    });

    it("does not find another community's item", async () => {
      const id = await createMedia({
        title: "Elsewhere",
        characterId: otherCharacterId,
      });

      await expect(
        mediaService.findOne(id, undefined, communityId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("galleries", () => {
    it("lists galleries reaching the community by character or by creation", async () => {
      const viaCharacter = await createGallery("Here", characterId);
      const viaCreation = (
        await testApp.getDb().gallery.create({
          data: {
            name: "Made here",
            ownerId,
            communityId,
            visibility: Visibility.PUBLIC,
          },
        })
      ).id;
      await createGallery("There", otherCharacterId);
      await createGallery("Loose");

      const result = await galleriesService.findAll({ communityId });

      expect(result.galleries.map((g) => g.id).sort()).toEqual(
        [viaCharacter, viaCreation].sort(),
      );
      expect(result.total).toBe(2);
    });

    // The same rule an upload follows: the host names the community when no
    // character does, and only for someone who belongs to it.
    describe("create", () => {
      it("files a characterless gallery under the host's community", async () => {
        const gallery = await galleriesService.create(ownerId, {
          name: "Sketches",
          communityId,
        });

        expect(gallery.communityId).toBe(communityId);
      });

      it("ignores the host's community when a character names one", async () => {
        const gallery = await galleriesService.create(ownerId, {
          name: "Sketches",
          characterId,
          communityId: otherCommunityId,
        });

        expect(gallery.communityId).toBeNull();
      });

      it("ignores a community the creator does not belong to", async () => {
        const gallery = await galleriesService.create(ownerId, {
          name: "Sketches",
          communityId: otherCommunityId,
        });

        expect(gallery.communityId).toBeNull();
      });
    });

    it("narrows liked galleries", async () => {
      const here = await createGallery("Here", characterId);
      const there = await createGallery("There", otherCharacterId);
      await testApp.getDb().like.createMany({
        data: [
          { userId: ownerId, galleryId: here },
          { userId: ownerId, galleryId: there },
        ],
      });

      const scoped = await galleriesService.findLikedGalleries(
        ownerId,
        communityId,
      );
      const all = await galleriesService.findLikedGalleries(ownerId);

      expect(scoped.map((g) => g.id)).toEqual([here]);
      expect(all).toHaveLength(2);
    });

    it("finds one gallery in its own community", async () => {
      const id = await createGallery("Here", characterId);

      await expect(
        galleriesService.findOne(id, undefined, communityId),
      ).resolves.toMatchObject({ id });
    });

    it("does not find another community's gallery", async () => {
      const id = await createGallery("There", otherCharacterId);

      await expect(
        galleriesService.findOne(id, undefined, communityId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
