import { TestApp } from "../../test/setup-e2e";
import { ImagesModule } from "./images.module";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";

/**
 * Who may re-frame an image's thumbnail, asserted at the API.
 *
 * The browser suite checks that a visitor is not *offered* the control, which
 * is a different claim: hiding a button is not authorization. This is the one
 * that matters if someone calls the mutation directly.
 *
 * The successful re-frame is not here. It reads the original back out of S3
 * and re-renders it, and this suite has no bucket -- `image-crop-rendering
 * .spec.ts` covers that path against real sharp with storage stubbed. What is
 * left for this file is the guard, so every case below stops before the
 * service runs.
 */
const UPDATE_IMAGE = `
  mutation UpdateImage($id: ID!, $input: UpdateImageInput!) {
    updateImage(id: $id, input: $input) {
      id
      altText
      thumbnailCrop {
        x
        y
        width
        height
      }
    }
  }
`;

describe("ImagesResolver (e2e)", () => {
  let testApp: TestApp;
  let ownerId: string;
  let ownerToken: string;
  let strangerToken: string;
  let imageId: string;

  const CROP = { x: 10, y: 10, width: 50, height: 50 };

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setup({
      imports: [DatabaseModule, AuthModule, ImagesModule],
    });
  });

  beforeEach(async () => {
    await testApp.clearDatabase();

    const owner = await testApp.createTestUser();
    ownerId = owner.id;
    ownerToken = await testApp.generateTestToken(ownerId);

    const stranger = await testApp.createTestUser();
    strangerToken = await testApp.generateTestToken(stranger.id);

    // Written straight to the database: an upload would need multipart, sharp
    // and a bucket, none of which this file is about.
    const image = await testApp.getDb().image.create({
      data: {
        filename: "guarded.png",
        originalFilename: "guarded.png",
        originalUrl: "https://cdn.test/guarded/original.png",
        thumbnailUrl: "https://cdn.test/guarded/thumbnail.png",
        uploaderId: ownerId,
        width: 200,
        height: 100,
        fileSize: 1234,
        mimeType: "image/png",
      },
    });
    imageId = image.id;
  });

  afterAll(async () => {
    await testApp.teardown();
  });

  describe("updateImage thumbnailCrop", () => {
    it("refuses an anonymous caller", async () => {
      const response = await testApp.graphqlRequest(UPDATE_IMAGE, {
        id: imageId,
        input: { thumbnailCrop: CROP },
      });

      expect(response.body.errors[0].extensions.code).toBe("FORBIDDEN");
    });

    it("refuses a signed-in stranger", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_IMAGE,
        { id: imageId, input: { thumbnailCrop: CROP } },
        strangerToken,
      );

      expect(response.body.errors[0].extensions.code).toBe("FORBIDDEN");
    });

    it("leaves the framing alone when a stranger is refused", async () => {
      await testApp.authenticatedGraphqlRequest(
        UPDATE_IMAGE,
        { id: imageId, input: { thumbnailCrop: CROP } },
        strangerToken,
      );

      const after = await testApp
        .getDb()
        .image.findUnique({ where: { id: imageId } });

      expect(after?.thumbnailCropX).toBeNull();
      expect(after?.thumbnailUrl).toBe(
        "https://cdn.test/guarded/thumbnail.png",
      );
    });

    /**
     * The control for the two refusals above: the same mutation, the same
     * image, the owner's token, and it goes through. Without this, a mutation
     * that was broken for everyone would look like working authorization.
     *
     * `altText` rather than a crop because a crop would send the service to
     * S3, which is the part this file deliberately does not exercise.
     */
    it("admits the uploader", async () => {
      const response = await testApp.authenticatedGraphqlRequest(
        UPDATE_IMAGE,
        { id: imageId, input: { altText: "A guarded picture" } },
        ownerToken,
      );

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateImage).toMatchObject({
        id: imageId,
        altText: "A guarded picture",
        // Untouched, because the field was not sent.
        thumbnailCrop: null,
      });
    });
  });
});
