import * as request from "supertest";
import { TestApp } from "../../test/setup-e2e";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ImagesModule } from "./images.module";
import { S3Service } from "./s3.service";

/**
 * Who may `POST /images/upload` to a character, and whose moderators see an
 * upload that names a community. The one REST endpoint that checks community
 * permissions, so the one place they have to arrive outside GraphQL.
 */
describe("POST /images/upload permissions (e2e)", () => {
  let testApp: TestApp;
  let communityId: string;
  let speciesId: string;
  let ownerId: string;

  const s3 = {
    uploadImage: jest.fn(
      async ({
        imageId,
        sizeVariant,
      }: {
        imageId: string;
        sizeVariant: string;
      }) => ({ url: `https://cdn.test/${imageId}/${sizeVariant}.png` }),
    ),
    deleteImage: jest.fn(async () => undefined),
    deleteImages: jest.fn(async () => undefined),
  };

  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAIAAABM5OhcAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAzUlEQVR42u3SMQ0AAAgEsZeDCPwHWZhgYGhSBZfLVMO5SICxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsMBbGwlhgLIyFscBYGAtjgbEwFsYCY2EsjAXGwlgYC4yFsTAWGAtjYSwwFsbCWGAsjIWxwFgYC2OBsTAWxgJjYSyMBcbCWBgLjIWxMBYYC2NhLDAWxsJYYCyMhbHAWBgLY4GxMBbGAmNhLIwFxsJYGAuMhbEwFhgLY2EsjKUCxsJYGAuMhbEwFhgLY2EsMBa/x1one5LWE0ewPwAAAABJRU5ErkJggg==",
    "base64",
  );

  let seq = 0;
  /** A user, in the community with this role when one is given. */
  const user = async (
    role: Record<string, boolean> | null,
    account: Record<string, unknown> = {},
  ) => {
    const stamp = ++seq;
    const created = await testApp.createTestUser({
      username: `uploader_${stamp}`,
      email: `uploader_${stamp}@example.com`,
      ...account,
    });
    if (role) {
      const createdRole = await testApp.createTestRole(communityId, role);
      await testApp.createTestCommunityMember(created.id, createdRole.id);
    }
    return {
      id: created.id,
      token: await testApp.generateTestToken(created.id, created.username),
    };
  };

  const character = async (characterOwnerId: string | null) =>
    testApp.getDb().character.create({
      data: {
        name: "Ridley",
        ownerId: characterOwnerId,
        creatorId: ownerId,
        speciesId,
      },
    });

  const upload = (token: string, fields: Record<string, string>) => {
    let req = request(testApp.getApp().getHttpServer())
      .post("/images/upload")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", PNG, { filename: "art.png", contentType: "image/png" });
    for (const [name, value] of Object.entries(fields)) {
      req = req.field(name, value);
    }
    return req;
  };

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

    const community = await testApp.createTestCommunity();
    communityId = community.id;
    speciesId = (await testApp.createTestSpecies(communityId)).id;
    ownerId = (await user({})).id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("to a character", () => {
    it("lets an owner with canUploadOwnCharacterImages upload to their own", async () => {
      const uploader = await user({ canUploadOwnCharacterImages: true });
      const own = await character(uploader.id);

      const response = await upload(uploader.token, { characterId: own.id });

      expect(response.status).toBe(201);
    });

    it("refuses an owner whose role lacks it", async () => {
      const uploader = await user({});
      const own = await character(uploader.id);

      const response = await upload(uploader.token, { characterId: own.id });

      expect(response.status).toBe(403);
    });

    it("refuses someone else's character without canUploadCharacterImages", async () => {
      const uploader = await user({ canUploadOwnCharacterImages: true });
      const theirs = await character(ownerId);

      const response = await upload(uploader.token, {
        characterId: theirs.id,
      });

      expect(response.status).toBe(403);
    });

    it("lets staff with canUploadCharacterImages upload to anyone's", async () => {
      const staff = await user({ canUploadCharacterImages: true });
      const theirs = await character(ownerId);

      const response = await upload(staff.token, { characterId: theirs.id });

      expect(response.status).toBe(201);
    });

    it("lets a site admin who is in no community upload to anyone's", async () => {
      const admin = await user(null, { isAdmin: true });
      const theirs = await character(ownerId);

      const response = await upload(admin.token, { characterId: theirs.id });

      expect(response.status).toBe(201);
    });

    it("refuses someone who is in no community", async () => {
      const stranger = await user(null);
      const theirs = await character(ownerId);

      const response = await upload(stranger.token, {
        characterId: theirs.id,
      });

      expect(response.status).toBe(403);
    });
  });

  describe("naming a community", () => {
    const reviewingCommunity = async (mediaId: string) =>
      (
        await testApp.getDb().media.findUnique({
          where: { id: mediaId },
          select: { communityId: true },
        })
      )?.communityId ?? null;

    it("files a member's upload under their community", async () => {
      const member = await user({});

      const response = await upload(member.token, { communityId });

      expect(response.status).toBe(201);
      expect(await reviewingCommunity(response.body.id)).toBe(communityId);
    });

    it("files a site admin's upload under a community they are not in", async () => {
      const admin = await user(null, { isAdmin: true });

      const response = await upload(admin.token, { communityId });

      expect(response.status).toBe(201);
      expect(await reviewingCommunity(response.body.id)).toBe(communityId);
    });

    it("leaves a stranger's upload with no community", async () => {
      const stranger = await user(null);

      const response = await upload(stranger.token, { communityId });

      expect(response.status).toBe(201);
      expect(await reviewingCommunity(response.body.id)).toBeNull();
    });
  });
});
