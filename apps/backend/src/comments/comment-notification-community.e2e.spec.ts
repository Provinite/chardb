import { TestApp } from "../../test/setup-e2e";
import { CommentsService, CommentableTypeFilter } from "./comments.service";
import { CommentsModule } from "./comments.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { Visibility } from "@chardb/database";

/**
 * A comment notification names the community the commented thing belongs to,
 * so a community host's notification list shows it there and nowhere else.
 */
describe("comment notifications name their community (e2e)", () => {
  let testApp: TestApp;
  let comments: CommentsService;

  let ownerId: string;
  let commenterId: string;
  let communityId: string;
  let characterId: string;

  const db = () => testApp.getDb();

  const notificationCommunity = async () =>
    (
      await db().notification.findFirstOrThrow({
        where: { recipientId: ownerId },
      })
    ).communityId;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, CommentsModule],
    });
    comments = testApp.getModuleRef().get(CommentsService);
  });

  beforeEach(async () => {
    await testApp.clearDatabase();

    ownerId = (await testApp.createTestUser()).id;
    commenterId = (
      await testApp.createTestUser({
        email: "commenter@test.dev",
        username: "commenter",
      })
    ).id;
    const setup = await testApp.createTestCommunitySetup(ownerId);
    communityId = setup.communityId;
    characterId = (
      await db().character.create({
        data: {
          name: "Here",
          ownerId,
          speciesId: setup.speciesId,
          visibility: Visibility.PUBLIC,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it("on a character, names its species' community", async () => {
    await comments.create(commenterId, {
      content: "Nice",
      entityType: CommentableTypeFilter.CHARACTER,
      entityId: characterId,
    });

    expect(await notificationCommunity()).toBe(communityId);
  });

  it("on a gallery made in a community, names that community", async () => {
    const gallery = await db().gallery.create({
      data: { name: "Made here", ownerId, communityId },
    });

    await comments.create(commenterId, {
      content: "Nice",
      entityType: CommentableTypeFilter.GALLERY,
      entityId: gallery.id,
    });

    expect(await notificationCommunity()).toBe(communityId);
  });

  it("on a gallery with a character, names the character's community", async () => {
    const gallery = await db().gallery.create({
      data: { name: "Here's", ownerId, characterId },
    });

    await comments.create(commenterId, {
      content: "Nice",
      entityType: CommentableTypeFilter.GALLERY,
      entityId: gallery.id,
    });

    expect(await notificationCommunity()).toBe(communityId);
  });

  // A profile belongs to no community.
  it("on a profile, names none", async () => {
    await comments.create(commenterId, {
      content: "Hi",
      entityType: CommentableTypeFilter.USER,
      entityId: ownerId,
    });

    expect(await notificationCommunity()).toBeNull();
  });
});
