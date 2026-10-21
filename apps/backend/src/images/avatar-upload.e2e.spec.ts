import * as request from "supertest";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ImagesModule } from "./images.module";
import { S3Service } from "./s3.service";
import { ModerationStatus } from "@chardb/database";

/**
 * `POST /images/avatar` (#410): upload a profile picture and make it your
 * avatar, in one call.
 *
 * Avatars are not moderated and are not posts, so what is worth asserting is
 * mostly what does NOT happen: no Media row, no PENDING, no second request to
 * set it. The previous avatar goes in the same call, because an avatar
 * nobody uses has no other reference that would ever delete it.
 */
describe("POST /images/avatar (e2e)", () => {
  let testApp: TestApp;
  let userId: string;
  let token: string;

  /** Every S3 key "uploaded", so the test can see what was stored. */
  const s3 = {
    uploadImage: jest.fn(
      async ({
        imageId,
        sizeVariant,
      }: {
        imageId: string;
        sizeVariant: string;
      }) => ({
        url: `https://cdn.test/${imageId}/${sizeVariant}.png`,
      }),
    ),
    deleteImage: jest.fn(async () => undefined),
    deleteImages: jest.fn(async () => undefined),
  };

  /** A 200x100 PNG, so a square crop is a real choice. */
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAIAAABM5OhcAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAzUlEQVR42u3SMQ0AAAgEsZeDCPwHWZhgYGhSBZfLVMO5SICxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsjKUCxsJYGAuMhbEwFhgLY2EsMBa/x1one5LWE0ewPwAAAABJRU5ErkJggg==",
    "base64",
  );

  const upload = (
    crop?: { x: number; y: number; width: number; height: number },
    authToken: string | null = token,
  ) => {
    let req = request(testApp.getApp().getHttpServer()).post("/images/avatar");
    if (authToken) req = req.set("Authorization", `Bearer ${authToken}`);
    req = req.attach("file", PNG, {
      filename: "avatar.png",
      contentType: "image/png",
    });
    if (crop) {
      req = req
        .field("thumbnailCropX", String(crop.x))
        .field("thumbnailCropY", String(crop.y))
        .field("thumbnailCropWidth", String(crop.width))
        .field("thumbnailCropHeight", String(crop.height));
    }
    return req;
  };

  const avatarOf = async (id: string) =>
    (
      await testApp
        .getDb()
        .user.findUnique({ where: { id }, select: { avatarImageId: true } })
    )?.avatarImageId ?? null;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup(
      { imports: [DatabaseModule, AuthModule, UsersModule, ImagesModule] },
      (builder) => builder.overrideProvider(S3Service).useValue(s3),
    );
  });

  beforeEach(async () => {
    await testApp.clearDatabase();
    jest.clearAllMocks();

    const user = await testApp.createTestUser();
    userId = user.id;
    token = await testApp.generateTestToken(userId);
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  it("stores an approved avatar image and sets it, with no media", async () => {
    const response = await upload();

    expect(response.status).toBe(201);
    const imageId = response.body.id;
    expect(typeof imageId).toBe("string");

    const image = await testApp
      .getDb()
      .image.findUnique({ where: { id: imageId } });
    expect(image).toMatchObject({
      uploaderId: userId,
      isAvatarUpload: true,
      moderationStatus: ModerationStatus.APPROVED,
    });
    await expect(avatarOf(userId)).resolves.toBe(imageId);
    await expect(
      testApp.getDb().media.count({ where: { imageId } }),
    ).resolves.toBe(0);
  });

  it("records the chosen crop", async () => {
    const response = await upload({ x: 50, y: 0, width: 100, height: 100 });

    expect(response.status).toBe(201);
    const image = await testApp
      .getDb()
      .image.findUnique({ where: { id: response.body.id } });
    expect(image).toMatchObject({
      thumbnailCropX: 50,
      thumbnailCropY: 0,
      thumbnailCropWidth: 100,
      thumbnailCropHeight: 100,
    });
  });

  it("deletes the avatar it replaces", async () => {
    const first = await upload();
    const second = await upload();

    expect(second.status).toBe(201);
    await expect(avatarOf(userId)).resolves.toBe(second.body.id);
    await expect(
      testApp.getDb().image.findUnique({ where: { id: first.body.id } }),
    ).resolves.toBeNull();
  });

  /**
   * Replacing an avatar that is also still a post somewhere -- possible only
   * for avatars set before #410 -- must not delete the post's picture.
   */
  it("keeps a replaced avatar that some media still shows", async () => {
    const first = await upload();
    await testApp.getDb().media.create({
      data: { title: "Real artwork", ownerId: userId, imageId: first.body.id },
    });

    await upload();

    await expect(
      testApp.getDb().image.findUnique({ where: { id: first.body.id } }),
    ).resolves.not.toBeNull();
  });

  it("refuses an unauthenticated upload", async () => {
    const response = await upload(undefined, null);

    // The permission guard's answer, as for `/images/upload`.
    expect(response.status).toBe(403);
    await expect(testApp.getDb().image.count()).resolves.toBe(0);
  });
});
