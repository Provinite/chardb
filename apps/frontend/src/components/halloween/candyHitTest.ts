/**
 * Which candy a press on the board lands on.
 *
 * A candy's picture is a rectangle, but most of it is see-through: a press on
 * the empty corner of a round sticker should reach whatever is beneath. So
 * each picture's alpha channel is read once, shrunk to a small mask, and a
 * press is mapped into each candy's own picture -- undoing its place, scale
 * and rotation -- to see whether it lands on a pixel that is there.
 *
 * Everything here but `maskFromImage` is pure, so it is tested without a
 * board or a canvas. The pictures are served from the page's own origin,
 * which is what lets a canvas read them; nothing needs baking in advance.
 */
import { CANDY_SIZE, type Placement, type Point } from "./candyBoard";

/** A picture's alpha channel, row by row, 0 (clear) to 255 (solid). */
export interface AlphaMask {
  width: number;
  height: number;
  alpha: Uint8Array;
}

/** A candy as hit-testing needs it. */
export interface HitCandy {
  placement: Placement;
  /** The picture's width over its height. */
  aspect: number;
  /** Null until the picture is read: the whole box counts as the candy. */
  mask: AlphaMask | null;
}

/** About 10% opacity: soft shadows and anti-aliased edges are not the candy. */
const SOLID = 26;

/** A mask's longest side. Plenty for a fingertip; small to keep. */
export const MASK_SIZE = 64;

/**
 * The alpha channel of RGBA pixels, shrunk so its longest side is at most
 * `size`. Each mask pixel keeps the most solid pixel of the block it covers,
 * so a stick one pixel wide still catches a press.
 */
export function alphaMask(
  image: { width: number; height: number; data: Uint8ClampedArray },
  size: number = MASK_SIZE,
): AlphaMask {
  const block = Math.max(
    1,
    Math.ceil(Math.max(image.width, image.height) / size),
  );
  const width = Math.ceil(image.width / block);
  const height = Math.ceil(image.height / block);
  const alpha = new Uint8Array(width * height);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const value = image.data[(y * image.width + x) * 4 + 3];
      const cell = Math.floor(y / block) * width + Math.floor(x / block);
      if (value > alpha[cell]) alpha[cell] = value;
    }
  }
  return { width, height, alpha };
}

/**
 * A loaded picture's mask, or null when it cannot be read -- no canvas, or a
 * picture from another origin -- in which case its whole box stays the candy.
 */
export function maskFromImage(image: HTMLImageElement): AlphaMask | null {
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0);
    return alphaMask(context.getImageData(0, 0, width, height));
  } catch {
    return null;
  }
}

/** Whether `point`, in board pixels, lands on a solid part of `candy`. */
function hits(
  point: Point,
  board: { width: number; height: number },
  { placement: p, aspect, mask }: HitCandy,
): boolean {
  const width = CANDY_SIZE * p.scale * board.width;
  const height = width / aspect;
  // From the candy's centre, turned back by its rotation (clockwise on
  // screen, where y points down), into its own picture's axes.
  const dx = point.x - p.x * board.width;
  const dy = point.y - p.y * board.height;
  const radians = (p.rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const u = (cos * dx + sin * dy) / width + 0.5;
  const v = (cos * dy - sin * dx) / height + 0.5;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
  if (!mask) return true;
  const mx = Math.min(mask.width - 1, Math.floor(u * mask.width));
  const my = Math.min(mask.height - 1, Math.floor(v * mask.height));
  return mask.alpha[my * mask.width + mx] >= SOLID;
}

/**
 * Every candy a press lands on, by knock id, top of the pile first.
 * `candies` is the pile bottom first, as placements are kept; `point` is in
 * pixels from the board's top-left corner.
 */
export function candiesAt(
  point: Point,
  board: { width: number; height: number },
  candies: HitCandy[],
): number[] {
  const found: number[] = [];
  for (let i = candies.length - 1; i >= 0; i--) {
    if (hits(point, board, candies[i])) {
      found.push(candies[i].placement.knockEventId);
    }
  }
  return found;
}

/**
 * Which candy a click selects, given the candies under it top first. A fresh
 * click takes the top one; a click on the selected candy goes one down, and
 * from the bottom back to the top, so a buried candy can still be reached.
 */
export function nextSelection(
  hitIds: number[],
  current: number | null,
): number | null {
  if (hitIds.length === 0) return null;
  const index = current === null ? -1 : hitIds.indexOf(current);
  if (index === -1) return hitIds[0];
  return hitIds[(index + 1) % hitIds.length];
}
