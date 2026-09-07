import { BadRequestException } from "@nestjs/common";

/**
 * A thumbnail framing rect, in the original image's pixels *after* EXIF
 * rotation has been applied.
 *
 * That coordinate space matters and is easy to get wrong. A photo carrying an
 * EXIF orientation tag is stored one way and painted another: a browser shows
 * an orientation-6 image rotated 90 degrees, so the rect a cropper produces is
 * in the rotated space, while `sharp(buffer)` without `.rotate()` sees the
 * unrotated one. Feeding a rect from the first space to the second lands on
 * the wrong pixels when the numbers happen to fit, and throws
 * `extract_area: bad extract area` when they do not. Every read of these
 * numbers must therefore happen against a `.rotate()`d pipeline.
 */
export interface ThumbnailCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The size an image is *displayed* at, given its stored size and EXIF
 * orientation tag.
 *
 * Orientations 5 through 8 include a quarter turn, so the displayed image has
 * its axes swapped relative to the stored one; 1 through 4 do not. Browsers
 * apply this on their own, which is why an `<img>`'s `naturalWidth` can
 * disagree with what `sharp().metadata()` reports for the same file -- and why
 * a crop rect measured in the browser has to be validated against these
 * numbers rather than the stored ones.
 */
export function orientedDimensions(
  width: number,
  height: number,
  orientation?: number,
): { width: number; height: number } {
  const quarterTurned =
    orientation !== undefined && orientation >= 5 && orientation <= 8;

  return quarterTurned ? { width: height, height: width } : { width, height };
}

/**
 * The rect as it is spread across four nullable columns. All four are null
 * together, which means "no choice was made" -- centre crop.
 */
export interface ThumbnailCropColumns {
  thumbnailCropX: number | null;
  thumbnailCropY: number | null;
  thumbnailCropWidth: number | null;
  thumbnailCropHeight: number | null;
}

/**
 * Read a rect off a row, or null when none is stored.
 *
 * A partially-populated rect is rejected rather than treated as absent. The
 * database has a CHECK constraint that makes the state unreachable, so seeing
 * one here means something wrote around Prisma, and silently centre-cropping
 * would hide that.
 */
export function cropFromColumns(
  row: ThumbnailCropColumns,
): ThumbnailCrop | null {
  const { thumbnailCropX, thumbnailCropY, thumbnailCropWidth } = row;
  const { thumbnailCropHeight } = row;

  const present = [
    thumbnailCropX,
    thumbnailCropY,
    thumbnailCropWidth,
    thumbnailCropHeight,
  ].filter((value) => value !== null && value !== undefined);

  if (present.length === 0) {
    return null;
  }

  if (present.length !== 4) {
    throw new BadRequestException(
      "Stored thumbnail crop is incomplete; expected all four of x, y, width and height",
    );
  }

  return {
    x: thumbnailCropX!,
    y: thumbnailCropY!,
    width: thumbnailCropWidth!,
    height: thumbnailCropHeight!,
  };
}

/** Spread a rect back across the four columns; null clears all four. */
export function cropToColumns(
  crop: ThumbnailCrop | null,
): ThumbnailCropColumns {
  if (!crop) {
    return {
      thumbnailCropX: null,
      thumbnailCropY: null,
      thumbnailCropWidth: null,
      thumbnailCropHeight: null,
    };
  }

  return {
    thumbnailCropX: crop.x,
    thumbnailCropY: crop.y,
    thumbnailCropWidth: crop.width,
    thumbnailCropHeight: crop.height,
  };
}

/**
 * Check a rect fits inside an image of the given (post-rotation) size.
 *
 * This exists so a bad rect is a 400 naming the problem rather than a 500:
 * sharp's `.extract()` throws `extract_area: bad extract area` for anything
 * out of bounds, which reaches the client as an unhandled server error and
 * tells whoever is looking at it nothing at all.
 *
 * Non-square rects are allowed on purpose. The cropper locks to a square
 * because the thumbnail is rendered 300x300 with `fit: "cover"`, but a rect
 * that is a pixel off square is not worth failing an upload over -- `cover`
 * absorbs it.
 */
export function validateThumbnailCrop(
  crop: ThumbnailCrop,
  imageWidth: number,
  imageHeight: number,
): void {
  const values = [crop.x, crop.y, crop.width, crop.height];

  if (values.some((value) => !Number.isInteger(value))) {
    throw new BadRequestException(
      "Thumbnail crop x, y, width and height must all be whole numbers of pixels",
    );
  }

  if (crop.width < 1 || crop.height < 1) {
    throw new BadRequestException("Thumbnail crop must be at least 1x1 pixels");
  }

  if (crop.x < 0 || crop.y < 0) {
    throw new BadRequestException(
      "Thumbnail crop cannot start outside the image",
    );
  }

  if (crop.x + crop.width > imageWidth || crop.y + crop.height > imageHeight) {
    throw new BadRequestException(
      `Thumbnail crop (${crop.x},${crop.y} ${crop.width}x${crop.height}) ` +
        `does not fit inside the image (${imageWidth}x${imageHeight})`,
    );
  }
}
