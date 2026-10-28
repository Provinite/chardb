/**
 * The board's nameplate: a banner sticker with the board's name on it.
 */
import { describe, it, expect } from "vitest";
import { CANDY_SIZE } from "../candyBoard";
import {
  NAMEPLATE_ID,
  NAMEPLATE_SIZE,
  nameplateSvg,
  nameplateUrl,
  stickerSize,
} from "../nameplate";

/** A measure that gives every character the same width, as tests have no fonts. */
const even = (text: string) => text.length * 30;

describe("nameplateSvg", () => {
  it("puts the name on the banner", () => {
    expect(nameplateSvg("Moonlit von Pumpkin", even)).toContain(
      ">Moonlit von Pumpkin</text>",
    );
  });

  it("escapes what would break the picture", () => {
    const svg = nameplateSvg("Spooky 'n' <Hoard> & Co", even);
    expect(svg).toContain(">Spooky &#39;n&#39; &lt;Hoard&gt; &amp; Co</text>");
  });

  it("is as wide as its name needs", () => {
    const width = (name: string) =>
      Number(/<svg[^>]* width="([\d.]+)"/.exec(nameplateSvg(name, even))?.[1]);
    expect(width("Spooky Moon")).toBeGreaterThan(0);
    expect(width("Whispering beyond the Marshmallow")).toBeGreaterThan(
      width("Spooky Moon"),
    );
  });
});

describe("nameplateUrl", () => {
  it("is the banner as an SVG picture", () => {
    expect(nameplateUrl("Spooky Moon", even)).toMatch(
      /^data:image\/svg\+xml;charset=utf-8,/,
    );
  });
});

describe("stickerSize", () => {
  it("makes the nameplate wider than a candy", () => {
    expect(NAMEPLATE_ID).toBe(0);
    expect(stickerSize(NAMEPLATE_ID)).toBe(NAMEPLATE_SIZE);
    expect(stickerSize(7)).toBe(CANDY_SIZE);
    expect(NAMEPLATE_SIZE).toBeGreaterThan(CANDY_SIZE);
  });
});
