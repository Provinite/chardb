/**
 * A board's nameplate: the trick-or-treat title ribbon with the board's name
 * on it, stuck on the board as a candy is. It is drawn as an SVG picture made
 * here, so it goes through everything a candy's picture does -- shadows, the
 * light, focus, the keyboard. Its whole box counts as it for a press: it is
 * solid enough. The ribbon goes in as a data address, from `loadRibbon`.
 */
import { CANDY_SIZE, type StickerFields } from "./candyBoard";

/** The nameplate at scale 1 is this fraction of the board's width across. */
export const NAMEPLATE_SIZE = 0.4;

/** How wide a sticker is at scale 1, as a fraction of the board's width. */
export const stickerSize = (sticker: StickerFields) =>
  sticker.nameplate ? NAMEPLATE_SIZE : CANDY_SIZE;

// The ribbon picture's measures, in its own pixels.
const RIBBON_WIDTH = 748;
const RIBBON_HEIGHT = 275;
/**
 * Between these the band runs flat, with the arch, folds and tails all
 * outside it: the part stretched for a long name.
 */
const MIDDLE_FROM = 240;
const MIDDLE_TO = 480;
/** How far the middle reaches under each end. */
const OVERLAP = 1;
/** How wide a name fits on the ribbon as drawn. */
const NAME_ROOM = 500;
/** The middle of the band, top to bottom, where the name sits. */
const BAND_MIDDLE = 90;

const FONT_SIZE = 64;
const FONT = `bold ${FONT_SIZE}px Georgia, 'Times New Roman', serif`;
/** The ribbon's own ink. */
const INK = "#3b1d0e";

/** A name's width in the ribbon's font, measured by the browser if it can. */
function measureName(text: string): number {
  try {
    const context = document.createElement("canvas").getContext("2d");
    if (context) {
      context.font = FONT;
      const { width } = context.measureText(text);
      if (width > 0) return width;
    }
  } catch {
    // No canvas: estimated below.
  }
  return text.length * FONT_SIZE * 0.6;
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * The part of the ribbon picture from `from` to `to`, drawn at `x`, `width`
 * wide: stretched across if that is wider than the part is.
 */
const piece = (
  ribbon: string,
  from: number,
  to: number,
  x: number,
  width: number,
) =>
  `<svg x="${x}" y="0" width="${width}" height="${RIBBON_HEIGHT}" viewBox="${from} 0 ${to - from} ${RIBBON_HEIGHT}" preserveAspectRatio="none">` +
  `<image href="${ribbon}" width="${RIBBON_WIDTH}" height="${RIBBON_HEIGHT}"/>` +
  `</svg>`;

/** The ribbon, as a data address, with a name on it, as SVG markup. */
export function nameplateSvg(
  name: string,
  ribbon: string,
  measure: (text: string) => number = measureName,
): string {
  const stretch = Math.max(0, Math.ceil(measure(name)) - NAME_ROOM);
  const width = RIBBON_WIDTH + stretch;
  const middleWidth = MIDDLE_TO - MIDDLE_FROM + stretch;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${RIBBON_HEIGHT}" viewBox="0 0 ${width} ${RIBBON_HEIGHT}">`,
    // The middle reaches a pixel under each end, which are drawn over it:
    // pieces only meeting leave a seam the page behind shows through.
    piece(
      ribbon,
      MIDDLE_FROM - OVERLAP,
      MIDDLE_TO + OVERLAP,
      MIDDLE_FROM - OVERLAP,
      middleWidth + 2 * OVERLAP,
    ),
    piece(ribbon, 0, MIDDLE_FROM, 0, MIDDLE_FROM),
    piece(
      ribbon,
      MIDDLE_TO,
      RIBBON_WIDTH,
      MIDDLE_FROM + middleWidth,
      RIBBON_WIDTH - MIDDLE_TO,
    ),
    `<text x="${width / 2}" y="${BAND_MIDDLE + FONT_SIZE * 0.35}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${FONT_SIZE}" fill="${INK}">${escapeXml(name)}</text>`,
    `</svg>`,
  ].join("");
}

/** The ribbon with a name on it, as a picture's address. */
export const nameplateUrl = (
  name: string,
  ribbon: string,
  measure?: (text: string) => number,
) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(nameplateSvg(name, ribbon, measure))}`;
