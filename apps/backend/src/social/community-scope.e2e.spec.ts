import { TestApp } from "../../test/setup-e2e";
import { SocialService } from "./social.service";
import { SocialModule } from "./social.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { Visibility } from "@chardb/database";

/**
 * Liked lists and the activity feed on a community host show only that
 * community's characters, galleries and media.
 */
describe("liked lists and feed scoped to a community (e2e)", () => {
  let testApp: TestApp;
  let social: SocialService;

  let viewerId: string;
  let authorId: string;
  let communityId: string;
  let hereCharacterId: string;
  let thereCharacterId: string;

  const db = () => testApp.getDb();

  const createGallery = async (name: string, characterId: string) =>
    (
      await db().gallery.create({
        data: {
          name,
          ownerId: authorId,
          characterId,
          visibility: Visibility.PUBLIC,
        },
      })
    ).id;

  const createImageMedia = async (title: string, characterId: string) => {
    const image = await db().image.create({
      data: {
        filename: `${title}.png`,
        originalFilename: `${title}.png`,
        originalUrl: `https://cdn.test/${title}.png`,
        uploaderId: authorId,
        width: 10,
        height: 10,
        fileSize: 10,
        mimeType: "image/png",
      },
    });
    return (
      await db().media.create({
        data: {
          title,
          ownerId: authorId,
          characterId,
          imageId: image.id,
          visibility: Visibility.PUBLIC,
        },
      })
    ).id;
  };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, SocialModule],
    });
    social = testApp.getModuleRef().get(SocialService);
  });

  beforeEach(async () => {
    await testApp.clearDatabase();

    viewerId = (await testApp.createTestUser()).id;
    authorId = (
      await testApp.createTestUser({
        email: "author@test.dev",
        username: "author",
      })
    ).id;

    const setup = await testApp.createTestCommunitySetup(authorId);
    communityId = setup.communityId;
    const other = await testApp.createTestCommunity("Somewhere Else");
    const otherSpecies = await db().species.create({
      data: { name: "Other Species", communityId: other.id },
    });

    hereCharacterId = (
      await db().character.create({
        data: {
          name: "Here",
          ownerId: authorId,
          speciesId: setup.speciesId,
          visibility: Visibility.PUBLIC,
        },
      })
    ).id;
    thereCharacterId = (
      await db().character.create({
        data: {
          name: "There",
          ownerId: authorId,
          speciesId: otherSpecies.id,
          visibility: Visibility.PUBLIC,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it("narrows liked characters", async () => {
    await db().like.createMany({
      data: [
        { userId: viewerId, characterId: hereCharacterId },
        { userId: viewerId, characterId: thereCharacterId },
      ],
    });

    const scoped = await social.getUserLikedCharacters(viewerId, communityId);
    const all = await social.getUserLikedCharacters(viewerId);

    expect(scoped.map((c) => c.id)).toEqual([hereCharacterId]);
    expect(all).toHaveLength(2);
  });

  it("narrows liked galleries", async () => {
    const here = await createGallery("Here", hereCharacterId);
    const there = await createGallery("There", thereCharacterId);
    await db().like.createMany({
      data: [
        { userId: viewerId, galleryId: here },
        { userId: viewerId, galleryId: there },
      ],
    });

    const scoped = await social.getUserLikedGalleries(viewerId, communityId);

    expect(scoped.map((g) => g.id)).toEqual([here]);
  });

  it("narrows liked media and keeps the search", async () => {
    const here = await createImageMedia("Sunset here", hereCharacterId);
    const hereOther = await createImageMedia("Portrait here", hereCharacterId);
    const there = await createImageMedia("Sunset there", thereCharacterId);
    await db().like.createMany({
      data: [here, hereOther, there].map((mediaId) => ({
        userId: viewerId,
        mediaId,
      })),
    });

    const scoped = await social.getUserLikedMedia(viewerId, {
      communityId,
      search: "Sunset",
    });

    expect(scoped.media.map((m) => m.id)).toEqual([here]);
    expect(scoped.total).toBe(1);
  });

  it("narrows the activity feed", async () => {
    await db().follow.create({
      data: { followerId: viewerId, followingId: authorId },
    });
    await createGallery("Here", hereCharacterId);
    await createGallery("There", thereCharacterId);
    await createImageMedia("Here art", hereCharacterId);
    await createImageMedia("There art", thereCharacterId);

    const feed = await social.getActivityFeed(viewerId, 30, 0, communityId);

    // The character, its gallery and its art; nothing from elsewhere.
    const names = feed.map((item) => item.content.name);
    expect(names.sort()).toEqual(["Here", "Here", "Here art"].sort());
  });
});
