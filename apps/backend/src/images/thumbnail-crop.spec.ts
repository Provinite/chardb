import { BadRequestException } from "@nestjs/common";
import {
  cropFromColumns,
  cropToColumns,
  orientedDimensions,
  validateThumbnailCrop,
} from "./thumbnail-crop";

describe("orientedDimensions", () => {
  it("leaves an untagged image alone", () => {
    expect(orientedDimensions(100, 50, undefined)).toEqual({
      width: 100,
      height: 50,
    });
  });

  it.each([1, 2, 3, 4])(
    "leaves orientation %i alone -- no quarter turn",
    (orientation) => {
      expect(orientedDimensions(100, 50, orientation)).toEqual({
        width: 100,
        height: 50,
      });
    },
  );

  it.each([5, 6, 7, 8])(
    "swaps the axes for orientation %i -- a quarter turn",
    (orientation) => {
      expect(orientedDimensions(100, 50, orientation)).toEqual({
        width: 50,
        height: 100,
      });
    },
  );
});

describe("cropFromColumns", () => {
  it("reads no crop as null, which is what every pre-existing image has", () => {
    expect(
      cropFromColumns({
        thumbnailCropX: null,
        thumbnailCropY: null,
        thumbnailCropWidth: null,
        thumbnailCropHeight: null,
      }),
    ).toBeNull();
  });

  it("reads all four back as a rect", () => {
    expect(
      cropFromColumns({
        thumbnailCropX: 10,
        thumbnailCropY: 20,
        thumbnailCropWidth: 30,
        thumbnailCropHeight: 40,
      }),
    ).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it("accepts a zero origin rather than mistaking it for absent", () => {
    expect(
      cropFromColumns({
        thumbnailCropX: 0,
        thumbnailCropY: 0,
        thumbnailCropWidth: 5,
        thumbnailCropHeight: 5,
      }),
    ).toEqual({ x: 0, y: 0, width: 5, height: 5 });
  });

  it("refuses a partial rect instead of silently centre-cropping", () => {
    expect(() =>
      cropFromColumns({
        thumbnailCropX: 10,
        thumbnailCropY: 20,
        thumbnailCropWidth: null,
        thumbnailCropHeight: 40,
      }),
    ).toThrow(BadRequestException);
  });
});

describe("cropToColumns", () => {
  it("clears all four for null", () => {
    expect(cropToColumns(null)).toEqual({
      thumbnailCropX: null,
      thumbnailCropY: null,
      thumbnailCropWidth: null,
      thumbnailCropHeight: null,
    });
  });

  it("round-trips through cropFromColumns", () => {
    const crop = { x: 1, y: 2, width: 3, height: 4 };
    expect(cropFromColumns(cropToColumns(crop))).toEqual(crop);
  });
});

describe("validateThumbnailCrop", () => {
  it("accepts a rect inside the image", () => {
    expect(() =>
      validateThumbnailCrop({ x: 10, y: 10, width: 50, height: 50 }, 100, 100),
    ).not.toThrow();
  });

  it("accepts a rect that exactly fills the image", () => {
    expect(() =>
      validateThumbnailCrop({ x: 0, y: 0, width: 100, height: 100 }, 100, 100),
    ).not.toThrow();
  });

  it("rejects a rect running off the right edge", () => {
    expect(() =>
      validateThumbnailCrop({ x: 60, y: 0, width: 50, height: 50 }, 100, 100),
    ).toThrow(/does not fit inside the image \(100x100\)/);
  });

  it("rejects a rect running off the bottom edge", () => {
    expect(() =>
      validateThumbnailCrop({ x: 0, y: 60, width: 50, height: 50 }, 100, 100),
    ).toThrow(/does not fit inside the image/);
  });

  it("rejects a negative origin", () => {
    expect(() =>
      validateThumbnailCrop({ x: -1, y: 0, width: 50, height: 50 }, 100, 100),
    ).toThrow(/cannot start outside the image/);
  });

  it("rejects a zero-area rect", () => {
    expect(() =>
      validateThumbnailCrop({ x: 0, y: 0, width: 0, height: 50 }, 100, 100),
    ).toThrow(/at least 1x1/);
  });

  it("rejects fractional pixels", () => {
    expect(() =>
      validateThumbnailCrop({ x: 0.5, y: 0, width: 50, height: 50 }, 100, 100),
    ).toThrow(/whole numbers of pixels/);
  });

  /**
   * The reason this function exists at all. sharp answers an out-of-bounds
   * extract with `extract_area: bad extract area`, which reaches the client as
   * a 500 and says nothing about what was wrong with the request.
   */
  it("throws BadRequestException, so the caller gets a 400 and not a 500", () => {
    expect(() =>
      validateThumbnailCrop({ x: 0, y: 0, width: 200, height: 200 }, 100, 100),
    ).toThrow(BadRequestException);
  });
});
