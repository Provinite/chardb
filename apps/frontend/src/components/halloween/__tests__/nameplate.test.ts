/**
 * The board's nameplate: the title ribbon with the board's name on it.
 */
import { describe, it, expect } from "vitest";
import { CANDY_SIZE, NAMEPLATE } from "../candyBoard";
import {
  NAMEPLATE_SIZE,
  nameplateSvg,
  nameplateUrl,
  stickerSize,
} from "../nameplate";

/** A measure that gives every character the same width, as tests have no fonts. */
const even = (text: string) => text.length * 30;

/** Stands in for the ribbon picture's data address. */
const RIBBON = "data:image/png;base64,cmliYm9u";

const svgOf = (name: string) => nameplateSvg(name, RIBBON, even);

describe("nameplateSvg", () => {
  it("puts the name on the ribbon", () => {
    expect(svgOf("Moonlit von Pumpkin")).toContain(
      ">Moonlit von Pumpkin</text>",
    );
  });

  it("escapes what would break the picture", () => {
    expect(svgOf("Spooky 'n' <Hoard> & Co")).toContain(
      ">Spooky &#39;n&#39; &lt;Hoard&gt; &amp; Co</text>",
    );
  });

  /** The whole picture's width. */
  const widthOf = (name: string) =>
    Number(/<svg[^>]* width="([\d.]+)"/.exec(svgOf(name))?.[1]);

  /** Each piece of the ribbon, in the order drawn: where it goes, how wide. */
  const pieces = (name: string) =>
    [...svgOf(name).matchAll(/<svg x="([\d.-]+)" y="0" width="([\d.]+)"/g)].map(
      (m) => ({ x: Number(m[1]), width: Number(m[2]) }),
    );

  it("is the ribbon as drawn, for a name that fits on it", () => {
    // 11 characters: 330 wide.
    expect(widthOf("Spooky Moon")).toBe(748);
    expect(svgOf("Spooky Moon")).toContain('height="275"');
  });

  it("stretches only the ribbon's middle, by as much as a long name overflows", () => {
    // 33 characters: 990 wide, 490 more than the ribbon has room for.
    expect(widthOf("Whispering beyond the Marshmallow")).toBe(1238);
    expect(pieces("Whispering beyond the Marshmallow")).toEqual([
      // The middle reaches a pixel under each end, so no seam shows through
      // where they meet; the ends are drawn over it.
      { x: 239, width: 732 },
      { x: 0, width: 240 },
      { x: 970, width: 268 },
    ]);
  });

  it("draws every piece from the ribbon picture", () => {
    expect(svgOf("Spooky Moon").split(`href="${RIBBON}"`)).toHaveLength(4);
  });
});

describe("nameplateUrl", () => {
  it("is the ribbon as an SVG picture", () => {
    expect(nameplateUrl("Spooky Moon", RIBBON, even)).toMatch(
      /^data:image\/svg\+xml;charset=utf-8,/,
    );
  });
});

describe("stickerSize", () => {
  it("makes the nameplate wider than a candy", () => {
    expect(stickerSize(NAMEPLATE)).toBe(NAMEPLATE_SIZE);
    expect(stickerSize({ candy: 7, nameplate: null })).toBe(CANDY_SIZE);
    expect(NAMEPLATE_SIZE).toBeGreaterThan(CANDY_SIZE);
  });
});
