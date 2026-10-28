/**
 * A board's nameplate: a ribbon banner with the board's name on it, stuck on
 * the board as a candy is. It is placed under id 0, which no knock has (the
 * backend's NAMEPLATE_ID), and drawn as an SVG picture made here, so it goes
 * through everything a candy's picture does -- shadows, the light, focus,
 * the keyboard. Its whole box counts as it for a press: it is solid enough.
 */
import { CANDY_SIZE } from "./candyBoard";

export const NAMEPLATE_ID = 0;

/** The nameplate at scale 1 is this fraction of the board's width across. */
export const NAMEPLATE_SIZE = 0.4;

/** How wide a sticker is at scale 1, as a fraction of the board's width. */
export const stickerSize = (knockEventId: number) =>
  knockEventId === NAMEPLATE_ID ? NAMEPLATE_SIZE : CANDY_SIZE;

// The banner's measures, in the picture's own units.
const FONT_SIZE = 52;
const FONT = `bold ${FONT_SIZE}px Georgia, 'Times New Roman', serif`;
/** Between the name and the band's ends. */
const PAD = 36;
const BAND_HEIGHT = 84;
/** How far each tail shows past the band, and how far below it it hangs. */
const TAIL = 56;
const DROP = 22;
/** How far each tail tucks under the band. */
const FOLD = 18;
/** The white die-cut edge around it all, as on the candies. */
const EDGE = 8;

/** A name's width in the banner's font, measured by the browser if it can. */
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

const points = (...xy: number[][]) => xy.map(([x, y]) => `${x},${y}`).join(" ");

/** The banner for a name, as SVG markup. */
export function nameplateSvg(
  name: string,
  measure: (text: string) => number = measureName,
): string {
  const bandWidth = Math.ceil(measure(name)) + 2 * PAD;
  const width = 2 * EDGE + 2 * TAIL + bandWidth;
  const height = 2 * EDGE + DROP + BAND_HEIGHT;
  const left = EDGE + TAIL;
  const right = left + bandWidth;
  const bandBottom = EDGE + BAND_HEIGHT;
  const tailTop = EDGE + DROP;
  const tailBottom = tailTop + BAND_HEIGHT;
  const tailMiddle = tailTop + BAND_HEIGHT / 2;

  const leftTail = points(
    [EDGE, tailTop],
    [left + FOLD, tailTop],
    [left + FOLD, tailBottom],
    [EDGE, tailBottom],
    [EDGE + TAIL * 0.4, tailMiddle],
  );
  const rightTail = points(
    [width - EDGE, tailTop],
    [right - FOLD, tailTop],
    [right - FOLD, tailBottom],
    [width - EDGE, tailBottom],
    [width - EDGE - TAIL * 0.4, tailMiddle],
  );
  const leftFold = points(
    [left, bandBottom],
    [left + FOLD, tailBottom],
    [left + FOLD, bandBottom],
  );
  const rightFold = points(
    [right, bandBottom],
    [right - FOLD, tailBottom],
    [right - FOLD, bandBottom],
  );
  const band = `x="${left}" y="${EDGE}" width="${bandWidth}" height="${BAND_HEIGHT}"`;
  const shapes = `<polygon points="${leftTail}"/><polygon points="${rightTail}"/><rect ${band}/>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    // The white edge: every shape again, behind, thickly outlined.
    `<g fill="#ffffff" stroke="#ffffff" stroke-width="${2 * EDGE - 2}" stroke-linejoin="round">${shapes}</g>`,
    `<polygon points="${leftTail}" fill="#9a3412"/>`,
    `<polygon points="${rightTail}" fill="#9a3412"/>`,
    `<polygon points="${leftFold}" fill="#7c2d12"/>`,
    `<polygon points="${rightFold}" fill="#7c2d12"/>`,
    `<rect ${band} fill="#ea580c"/>`,
    `<rect x="${left + 8}" y="${EDGE + 8}" width="${bandWidth - 16}" height="${BAND_HEIGHT - 16}" fill="none" stroke="#fdba74" stroke-width="3"/>`,
    `<text x="${width / 2}" y="${EDGE + BAND_HEIGHT / 2 + FONT_SIZE * 0.35}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="bold" font-size="${FONT_SIZE}" fill="#fff7ed">${escapeXml(name)}</text>`,
    `</svg>`,
  ].join("");
}

/** The banner for a name, as a picture's address. */
export const nameplateUrl = (
  name: string,
  measure?: (text: string) => number,
) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(nameplateSvg(name, measure))}`;
