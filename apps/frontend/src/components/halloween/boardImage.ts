/**
 * A candy board as a picture to keep, drawn in the browser -- nothing is
 * stored. It is drawn layer by layer as the board shows it, from the same
 * sums: the background and what mutes it, each sticker with its shadow, bottom
 * of the pile first, then the light over it all. A page screenshot would get
 * the board's filters and blend modes only nearly right; this gets them as
 * the board does.
 *
 * `drawBoard` draws on any canvas context with any picture loader, so it is
 * tested without a canvas; `downloadBoardImage` is what the page calls.
 */
import type { CSSProperties } from "react";
import {
  REFERENCE_BOARD_WIDTH,
  SURFACE_COLOUR,
  backgroundOf,
  backgroundUrl,
} from "./boardBackgrounds";
import { effectLayers, type BackgroundEffects } from "./backgroundEffects";
import {
  DEFAULT_LIGHTING,
  glowOf,
  lightWash,
  shadowOf,
  spotlightOf,
  type Lighting,
} from "./candyLighting";
import { candyImageUrl, type Placement } from "./candyBoard";
import { nameplateUrl, stickerSize } from "./nameplate";
import { loadRibbon } from "./ribbon";
import { formatBoardName, type BoardName } from "./boardName";

/** The picture's size: 4:3, as the board is, and about twice a big screen's. */
export const BOARD_IMAGE_WIDTH = 2400;
export const BOARD_IMAGE_HEIGHT = 1800;

/** Everything the board's picture is drawn from. */
export interface BoardScene {
  candies: readonly { knockEventId: number; slug: string }[];
  placements: readonly Placement[];
  background: string | null | undefined;
  backgroundEffects: BackgroundEffects | null | undefined;
  lighting: Lighting | null | undefined;
  name: BoardName | null | undefined;
}

export type LoadImage = (src: string) => Promise<HTMLImageElement>;

/** "Clover upon Coin" -> "clover-upon-coin.png"; "candy-board.png" unnamed. */
export function boardImageFileName(name: BoardName | null | undefined): string {
  if (!name) return "candy-board.png";
  const slug = formatBoardName(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "candy-board"}.png`;
}

const W = BOARD_IMAGE_WIDTH;
const H = BOARD_IMAGE_HEIGHT;
/** A cqw: what the board's lengths are measured in, a hundredth of its width. */
const CQW = W / 100;

/** A layer the board draws as a CSS colour, blended and faded, over all of it. */
function fillLayer(ctx: CanvasRenderingContext2D, layer: CSSProperties) {
  ctx.save();
  ctx.fillStyle = String(layer.backgroundColor);
  ctx.globalAlpha = Number(layer.opacity ?? 1);
  ctx.globalCompositeOperation = (layer.mixBlendMode ??
    "source-over") as GlobalCompositeOperation;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** A picture, or null for one that will not load: it is left out. */
const tryLoad = (load: LoadImage, src: string) => load(src).catch(() => null);

async function drawBackground(
  ctx: CanvasRenderingContext2D,
  scene: BoardScene,
  load: LoadImage,
) {
  ctx.fillStyle = SURFACE_COLOUR;
  ctx.fillRect(0, 0, W, H);
  const background = backgroundOf(scene.background);
  const image = await tryLoad(load, backgroundUrl(background));
  if (image?.naturalWidth && image.naturalHeight) {
    const { naturalWidth: iw, naturalHeight: ih } = image;
    if (background.kind === "full") {
      // Cover, centred, as background-size: cover does.
      const s = Math.max(W / iw, H / ih);
      ctx.drawImage(image, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
    } else {
      // A tile is as wide, as a share of the board, as the board shows it.
      const tw = (background.width / 2 / REFERENCE_BOARD_WIDTH) * W;
      const th = (tw * ih) / iw;
      for (let y = 0; y < H; y += th) {
        for (let x = 0; x < W; x += tw) ctx.drawImage(image, x, y, tw, th);
      }
    }
  }
  const { saturate, tint, dim } = effectLayers(scene.backgroundEffects ?? null);
  for (const layer of [saturate, tint, dim]) {
    if (layer) fillLayer(ctx, layer);
  }
}

async function drawStickers(
  ctx: CanvasRenderingContext2D,
  scene: BoardScene,
  load: LoadImage,
) {
  const slugs = new Map(scene.candies.map((c) => [c.knockEventId, c.slug]));
  const ribbon = scene.name ? await loadRibbon() : null;
  const nameplate =
    scene.name && ribbon
      ? nameplateUrl(formatBoardName(scene.name), ribbon)
      : null;
  const srcOf = ({ sticker }: Placement) => {
    if (sticker.nameplate) return nameplate;
    const slug = sticker.candy != null ? slugs.get(sticker.candy) : null;
    return slug ? candyImageUrl(slug) : null;
  };
  // Loaded together, drawn in order.
  const pictures = await Promise.all(
    scene.placements.map((p) => {
      const src = srcOf(p);
      return src ? tryLoad(load, src) : Promise.resolve(null);
    }),
  );
  // A shadow on the board falls the board's way, whatever a candy's turn: a
  // canvas's shadow offset is not turned with what it draws.
  const shadow = shadowOf(scene.lighting ?? DEFAULT_LIGHTING, 0);
  scene.placements.forEach((p, i) => {
    const image = pictures[i];
    if (!image?.naturalWidth || !image.naturalHeight) return;
    const w = stickerSize(p.sticker) * p.scale * W;
    const h = (w * image.naturalHeight) / image.naturalWidth;
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${shadow.opacity})`;
    ctx.shadowOffsetX = shadow.dx * CQW;
    ctx.shadowOffsetY = shadow.dy * CQW;
    ctx.shadowBlur = shadow.blur * CQW;
    ctx.translate(p.x * W, p.y * H);
    ctx.rotate((p.rotation * Math.PI) / 180);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  });
}

function drawLight(ctx: CanvasRenderingContext2D, scene: BoardScene) {
  const wash = lightWash(scene.lighting);
  if (wash) fillLayer(ctx, wash);

  const pool = spotlightOf(scene.lighting);
  if (!pool) return;
  const radius = (pool.radius / 100) * W;
  const litShare = pool.lit / pool.radius;
  /** The pool's ellipse, turned to the beam, filled with `stops`. */
  const fillPool = (
    stops: [number, string][],
    blend: GlobalCompositeOperation,
  ) => {
    ctx.save();
    ctx.translate((pool.x / 100) * W, (pool.y / 100) * H);
    ctx.rotate((pool.angle * Math.PI) / 180);
    ctx.scale(pool.stretch, 1);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    for (const [at, colour] of stops) gradient.addColorStop(at, colour);
    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = blend;
    // Past the pool's edge the last stop carries on, over the whole board.
    ctx.fillRect(-2 * W, -2 * W, 4 * W, 4 * W);
    ctx.restore();
  };
  const glow = glowOf(scene.lighting);
  if (glow) {
    const rgb = glow.rgb.join(", ");
    fillPool(
      [
        [0, `rgba(${rgb}, ${glow.alpha})`],
        [litShare, `rgba(${rgb}, 0)`],
      ],
      "soft-light",
    );
  }
  fillPool(
    [
      [litShare, "rgba(0, 0, 0, 0)"],
      [1, `rgba(0, 0, 0, ${pool.darkness})`],
    ],
    "source-over",
  );
}

/** Draws the board on `ctx`, BOARD_IMAGE_WIDTH by BOARD_IMAGE_HEIGHT. */
export async function drawBoard(
  ctx: CanvasRenderingContext2D,
  scene: BoardScene,
  load: LoadImage,
): Promise<void> {
  await drawBackground(ctx, scene, load);
  await drawStickers(ctx, scene, load);
  drawLight(ctx, scene);
}

const loadImage: LoadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A picture would not load"));
    image.src = src;
  });

/** How long the picture is kept once its download has been started. */
const RELEASE_AFTER_MS = 60_000;

/** Draws the board and saves it as a PNG, named for it. */
export async function downloadBoardImage(
  scene: BoardScene,
  load: LoadImage = loadImage,
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw the picture");
  await drawBoard(ctx, scene, load);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("This browser cannot save the picture");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = boardImageFileName(scene.name);
  link.click();
  // Firefox and older Safari start the download after the click returns: let
  // go of the picture straight away, and the download can come to nothing.
  setTimeout(() => URL.revokeObjectURL(url), RELEASE_AFTER_MS);
}
