import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import * as sharp from "sharp";
import { ImagesService } from "./images.service";
import { DatabaseService } from "../database/database.service";
import { TagsService } from "../tags/tags.service";
import { S3Service } from "./s3.service";
import { PermissionService } from "../auth/PermissionService";
import { CommunityResolverService } from "../auth/services/community-resolver.service";
import { mockDatabaseService } from "../../test/setup";

/**
 * Thumbnail rendering, with the real sharp.
 *
 * `images.service.spec.ts` stubs sharp so it can test orchestration cheaply,
 * which means nothing there decodes an image and nothing there can tell a
 * correctly framed thumbnail from a wrong one. These tests decode real bytes
 * and look at real pixels, because framing is the entire feature.
 */

const RED = { r: 255, g: 0, b: 0 };
const BLUE = { r: 0, g: 0, b: 255 };

/**
 * A genuinely animated 2-frame GIF: 4x4, frame one solid red, frame two solid
 * blue, written by hand because sharp 0.33 can read animated GIFs but cannot
 * create one (`join` arrived in 0.34, and raw input has no page height).
 *
 * Two frames of different colours is what makes the animated/static split
 * testable: a thumbnail that comes out red proves only the first frame was
 * read.
 */
const ANIMATED_GIF = Buffer.from(
  "R0lGODlhBAAEAIAAAP8AAAAA/yH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAABAAEAAAC" +
    "CgQIECBAgAABAgUAIfkEAAoAAAAsAAAAAAQABAAAAgpMmDBhwoQJEyYFADs=",
  "base64",
);

/**
 * A 400x200 image, red, with a 100x100 blue square at (300,100) -- the
 * bottom-right corner.
 *
 * The position is chosen so the two framings are distinguishable by a single
 * pixel. A centre cover-crop of a 400x200 image takes source x in [100,300),
 * so the blue square falls outside it and a default thumbnail is red; a crop
 * of exactly that square makes the thumbnail blue.
 */
async function markedImage(format: "jpeg" | "gif" | "png"): Promise<Buffer> {
  const patch = await sharp({
    create: { width: 100, height: 100, channels: 3, background: BLUE },
  })
    .png()
    .toBuffer();

  const composited = sharp({
    create: { width: 400, height: 200, channels: 3, background: RED },
  }).composite([{ input: patch, left: 300, top: 100 }]);

  if (format === "gif") return composited.gif().toBuffer();
  if (format === "png") return composited.png().toBuffer();
  return composited.jpeg().toBuffer();
}

/** A 100x50 landscape image tagged "rotate 90 CW to display". */
async function exifRotatedImage(): Promise<Buffer> {
  const patch = await sharp({
    create: { width: 20, height: 20, channels: 3, background: BLUE },
  })
    .png()
    .toBuffer();

  return sharp({
    create: { width: 100, height: 50, channels: 3, background: RED },
  })
    .composite([{ input: patch, left: 0, top: 0 }])
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

async function centrePixel(buffer: Buffer) {
  const { data, info } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const x = Math.floor(info.width / 2);
  const y = Math.floor(info.height / 2);
  const i = (y * info.width + x) * info.channels;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

/** Lossy encoders shift colours by a point or two; compare with slack. */
function expectColour(
  actual: { r: number; g: number; b: number },
  expected: { r: number; g: number; b: number },
) {
  expect(actual.r).toBeGreaterThan(expected.r - 12);
  expect(actual.r).toBeLessThan(expected.r + 12);
  expect(actual.g).toBeGreaterThan(expected.g - 12);
  expect(actual.g).toBeLessThan(expected.g + 12);
  expect(actual.b).toBeGreaterThan(expected.b - 12);
  expect(actual.b).toBeLessThan(expected.b + 12);
}

const mockTagsService = {
  findOrCreateTags: jest.fn(),
  getImageTags: jest.fn(),
};
const mockS3Service = {
  uploadImage: jest.fn(),
  getImage: jest.fn(),
  deleteImage: jest.fn(),
  deleteImages: jest.fn(),
};
const mockPermissionService = { hasCommunityPermission: jest.fn() };
const mockCommunityResolverService = { resolve: jest.fn() };

describe("thumbnail rendering (real sharp)", () => {
  let service: ImagesService;
  let db: typeof mockDatabaseService;

  /** The buffer that went up as the thumbnail variant. */
  function uploadedThumbnail(): Buffer {
    const call = mockS3Service.uploadImage.mock.calls.find(
      ([options]) => options.sizeVariant === "thumbnail",
    );
    if (!call) throw new Error("no thumbnail was uploaded");
    return call[0].buffer;
  }

  /** What went into `image.create`. */
  function createdImageData() {
    return db.image.create.mock.calls[0][0].data;
  }

  function fileOf(buffer: Buffer, name: string, mimetype: string) {
    return {
      originalname: name,
      mimetype,
      size: buffer.length,
      buffer,
    } as Express.Multer.File;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: TagsService, useValue: mockTagsService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: PermissionService, useValue: mockPermissionService },
        {
          provide: CommunityResolverService,
          useValue: mockCommunityResolverService,
        },
      ],
    }).compile();

    service = module.get<ImagesService>(ImagesService);
    db = module.get<DatabaseService>(
      DatabaseService,
    ) as unknown as typeof mockDatabaseService;

    mockS3Service.uploadImage.mockResolvedValue({
      key: "k",
      url: "https://cdn.test/img/thumbnail.jpg",
    });
    const createdImage = { id: "img1", uploaderId: "user1", tags_rel: [] };
    db.image.create.mockResolvedValue(createdImage);
    db.media.create.mockResolvedValue({
      id: "media1",
      ownerId: "user1",
      imageId: "img1",
      image: createdImage,
      owner: { id: "user1", username: "testuser" },
    });
  });

  describe("with no crop chosen", () => {
    it("produces a 300x300 centre crop, exactly as before this feature", async () => {
      const buffer = await markedImage("jpeg");

      await service.upload("user1", {
        file: fileOf(buffer, "marked.jpg", "image/jpeg"),
      });

      const thumbnail = uploadedThumbnail();
      const meta = await sharp(thumbnail).metadata();

      expect(meta.width).toBe(300);
      expect(meta.height).toBe(300);
      // The blue square sits outside a centre crop of a 400x200 image.
      expectColour(await centrePixel(thumbnail), RED);
    });

    it("stores no crop, so nothing needed backfilling", async () => {
      const buffer = await markedImage("jpeg");

      await service.upload("user1", {
        file: fileOf(buffer, "marked.jpg", "image/jpeg"),
      });

      expect(createdImageData()).toMatchObject({
        thumbnailCropX: null,
        thumbnailCropY: null,
        thumbnailCropWidth: null,
        thumbnailCropHeight: null,
      });
    });
  });

  describe("with a crop chosen", () => {
    it("frames the thumbnail on the chosen region", async () => {
      const buffer = await markedImage("jpeg");

      await service.upload("user1", {
        file: fileOf(buffer, "marked.jpg", "image/jpeg"),
        thumbnailCrop: { x: 300, y: 100, width: 100, height: 100 },
      });

      const thumbnail = uploadedThumbnail();
      const meta = await sharp(thumbnail).metadata();

      expect(meta.width).toBe(300);
      expect(meta.height).toBe(300);
      expectColour(await centrePixel(thumbnail), BLUE);
    });

    it("stores the rect against the original", async () => {
      const buffer = await markedImage("jpeg");

      await service.upload("user1", {
        file: fileOf(buffer, "marked.jpg", "image/jpeg"),
        thumbnailCrop: { x: 300, y: 100, width: 100, height: 100 },
      });

      expect(createdImageData()).toMatchObject({
        thumbnailCropX: 300,
        thumbnailCropY: 100,
        thumbnailCropWidth: 100,
        thumbnailCropHeight: 100,
      });
    });

    it("rejects a rect that runs off the image, naming the problem", async () => {
      const buffer = await markedImage("jpeg");

      await expect(
        service.upload("user1", {
          file: fileOf(buffer, "marked.jpg", "image/jpeg"),
          thumbnailCrop: { x: 350, y: 100, width: 100, height: 100 },
        }),
      ).rejects.toThrow(/does not fit inside the image \(400x200\)/);
    });

    it("uploads nothing when the rect is rejected", async () => {
      const buffer = await markedImage("jpeg");

      await expect(
        service.upload("user1", {
          file: fileOf(buffer, "marked.jpg", "image/jpeg"),
          thumbnailCrop: { x: 0, y: 0, width: 4000, height: 4000 },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Service.uploadImage).not.toHaveBeenCalled();
    });
  });

  describe("EXIF-rotated images", () => {
    /**
     * The failure this guards against is silent. A browser paints an
     * orientation-6 photo rotated, so a cropper measures against the rotated
     * size; sharp reads the stored size. Get the two spaces confused and the
     * crop lands somewhere else entirely, or throws deep inside libvips.
     */
    it("records the size the browser sees, not the stored one", async () => {
      const buffer = await exifRotatedImage();

      await service.upload("user1", {
        file: fileOf(buffer, "rotated.jpg", "image/jpeg"),
      });

      // Stored 100x50; displayed 50x100.
      expect(createdImageData()).toMatchObject({ width: 50, height: 100 });
    });

    it("applies a crop in the coordinates the browser reports", async () => {
      const buffer = await exifRotatedImage();

      // Only meaningful after rotation: x runs to 50, y runs to 100.
      await service.upload("user1", {
        file: fileOf(buffer, "rotated.jpg", "image/jpeg"),
        thumbnailCrop: { x: 10, y: 60, width: 30, height: 30 },
      });

      const meta = await sharp(uploadedThumbnail()).metadata();
      expect(meta.width).toBe(300);
      expect(meta.height).toBe(300);
    });

    it("rejects a rect that only fits the unrotated image", async () => {
      const buffer = await exifRotatedImage();

      // 90 wide fits the stored 100x50 but not the displayed 50x100.
      await expect(
        service.upload("user1", {
          file: fileOf(buffer, "rotated.jpg", "image/jpeg"),
          thumbnailCrop: { x: 0, y: 0, width: 90, height: 40 },
        }),
      ).rejects.toThrow(/does not fit inside the image \(50x100\)/);
    });
  });

  describe("GIFs", () => {
    it("crops a GIF the same way as any other image", async () => {
      const buffer = await markedImage("gif");

      await service.upload("user1", {
        file: fileOf(buffer, "marked.gif", "image/gif"),
        thumbnailCrop: { x: 300, y: 100, width: 100, height: 100 },
      });

      expectColour(await centrePixel(uploadedThumbnail()), BLUE);
    });

    it("thumbnails an animated GIF to a still JPEG of its first frame", async () => {
      await service.upload("user1", {
        file: fileOf(ANIMATED_GIF, "spin.gif", "image/gif"),
        thumbnailCrop: { x: 0, y: 0, width: 4, height: 4 },
      });

      const thumbnail = uploadedThumbnail();
      const meta = await sharp(thumbnail).metadata();

      expect(meta.format).toBe("jpeg");
      expect(meta.width).toBe(300);
      expect(meta.height).toBe(300);
      // Frame one is red, frame two blue. Red means one frame was read.
      expectColour(await centrePixel(thumbnail), RED);
    });

    /**
     * Reading an animated GIF with `{ animated: true }` yields every frame
     * stacked into one tall image, so a rect below the first frame would
     * quietly succeed and thumbnail the wrong frame. Measuring one frame is
     * what makes this a 400.
     */
    it("measures one frame, not the frames stacked together", async () => {
      await expect(
        service.upload("user1", {
          file: fileOf(ANIMATED_GIF, "spin.gif", "image/gif"),
          thumbnailCrop: { x: 0, y: 4, width: 4, height: 4 },
        }),
      ).rejects.toThrow(/does not fit inside the image \(4x4\)/);
    });

    it("keeps the medium variant animated", async () => {
      await service.upload("user1", {
        file: fileOf(ANIMATED_GIF, "spin.gif", "image/gif"),
      });

      const medium = mockS3Service.uploadImage.mock.calls.find(
        ([options]) => options.sizeVariant === "medium",
      );
      const meta = await sharp(medium![0].buffer, {
        animated: true,
      }).metadata();

      expect(meta.pages).toBe(2);
    });
  });

  describe("re-cropping an existing image", () => {
    const existing = {
      id: "img1",
      uploaderId: "user1",
      originalUrl: "https://cdn.test/img1/original.jpg",
      thumbnailUrl: "https://cdn.test/img1/thumbnail.jpg",
      originalFilename: "marked.jpg",
      mimeType: "image/jpeg",
      width: 400,
      height: 200,
      artistId: null,
      tags_rel: [],
    };

    beforeEach(async () => {
      db.image.findUnique.mockResolvedValue(existing);
      db.image.update.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ ...existing, ...data }),
      );
      mockS3Service.getImage.mockResolvedValue(await markedImage("jpeg"));
      mockS3Service.uploadImage.mockResolvedValue({
        key: "img1/thumbnail-abcd1234.jpg",
        url: "https://cdn.test/img1/thumbnail-abcd1234.jpg",
      });
    });

    it("re-renders from the original, not from the old thumbnail", async () => {
      await service.update("img1", "user1", {
        thumbnailCrop: { x: 300, y: 100, width: 100, height: 100 },
      });

      expect(mockS3Service.getImage).toHaveBeenCalledWith(existing.originalUrl);
      expectColour(await centrePixel(uploadedThumbnail()), BLUE);
    });

    /**
     * Objects go up `Cache-Control: immutable, max-age=31536000`. Rewriting the
     * same key would leave every cache showing the old framing for a year, so
     * the new thumbnail has to land somewhere new.
     */
    it("writes to a new key rather than over the old one", async () => {
      await service.update("img1", "user1", {
        thumbnailCrop: { x: 300, y: 100, width: 100, height: 100 },
      });

      const [options] = mockS3Service.uploadImage.mock.calls.find(
        ([o]) => o.sizeVariant === "thumbnail",
      )!;

      expect(options.keySuffix).toEqual(expect.any(String));
      expect(options.keySuffix.length).toBeGreaterThan(0);
    });

    it("points the row at the new thumbnail and drops the old object", async () => {
      const updated = await service.update("img1", "user1", {
        thumbnailCrop: { x: 300, y: 100, width: 100, height: 100 },
      });

      expect(updated.thumbnailUrl).toBe(
        "https://cdn.test/img1/thumbnail-abcd1234.jpg",
      );
      expect(mockS3Service.deleteImage).toHaveBeenCalledWith(
        "https://cdn.test/img1/thumbnail.jpg",
      );
      expect(db.image.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thumbnailCropX: 300,
            thumbnailCropY: 100,
            thumbnailCropWidth: 100,
            thumbnailCropHeight: 100,
          }),
        }),
      );
    });

    it("clears the framing back to a centre crop for an explicit null", async () => {
      await service.update("img1", "user1", { thumbnailCrop: null });

      expectColour(await centrePixel(uploadedThumbnail()), RED);
      expect(db.image.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ thumbnailCropX: null }),
        }),
      );
    });

    it("leaves the thumbnail alone when the field is omitted", async () => {
      await service.update("img1", "user1", { altText: "just a caption" });

      expect(mockS3Service.getImage).not.toHaveBeenCalled();
      expect(mockS3Service.uploadImage).not.toHaveBeenCalled();
      expect(mockS3Service.deleteImage).not.toHaveBeenCalled();
    });

    it("keeps the old thumbnail when the re-render fails", async () => {
      mockS3Service.getImage.mockRejectedValue(new Error("S3 is down"));

      await expect(
        service.update("img1", "user1", {
          thumbnailCrop: { x: 300, y: 100, width: 100, height: 100 },
        }),
      ).rejects.toThrow();

      expect(db.image.update).not.toHaveBeenCalled();
      expect(mockS3Service.deleteImage).not.toHaveBeenCalled();
    });
  });
});
