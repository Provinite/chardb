import { createVar, style } from "@vanilla-extract/css";
import { focusRing, hover, vars } from "@chardb/ui/theme";

/**
 * The pad's size: a circle standing for the board. Everything around it is
 * sized from it, so the height slider stands exactly as tall.
 */
const pad = vars.size.column.lg;

/** Where the light and its spotlight sit, from the board's settings. */
export const dotLeft = createVar();
export const dotTop = createVar();
export const poolLeft = createVar();
export const poolTop = createVar();
export const poolWidth = createVar();
export const poolHeight = createVar();
export const poolTransform = createVar();

export const trigger = style([
  focusRing,
  {
    display: "inline-flex",
    alignItems: "center",
    gap: vars.space.sm,
    minBlockSize: vars.size.target.comfortable,
    paddingBlock: vars.space.sm,
    paddingInline: vars.space.md,
    border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
    borderRadius: vars.radius.md,
    background: vars.surface.page,
    color: vars.text.default,
    font: "inherit",
    cursor: "pointer",
    "@media": hover({
      "&:hover": { borderColor: vars.action.primary.bg },
    }),
  },
]);

export const panel = style({
  color: vars.text.muted,
});

/** The pad, with its info button and reset button over its top corners. */
export const padArea = style({
  position: "relative",
});

export const padSurface = style([
  focusRing,
  {
    position: "relative",
    inlineSize: pad,
    blockSize: pad,
    border: `${vars.borderWidth.thick} solid ${vars.border.default}`,
    borderRadius: vars.radius.full,
    background: `radial-gradient(circle, ${vars.surface.raised} 0 60%, ${vars.border.default} 100%)`,
    cursor: "crosshair",
    touchAction: "none",
    selectors: {
      // The board's centre, where an overhead light sits.
      "&::after": {
        content: '""',
        position: "absolute",
        left: "50%",
        top: "50%",
        inlineSize: vars.space.xs,
        blockSize: vars.space.xs,
        borderRadius: vars.radius.full,
        background: vars.text.muted,
        transform: "translate(-50%, -50%)",
      },
    },
  },
]);

/** The light itself, centred on where it is. */
export const dot = style({
  position: "absolute",
  left: dotLeft,
  top: dotTop,
  // Content-box: the fill plus its edge on both sides.
  inlineSize: vars.space.md,
  blockSize: vars.space.md,
  border: `${vars.borderWidth.thick} solid ${vars.illustration.lamp.edge}`,
  borderRadius: vars.radius.full,
  background: vars.illustration.lamp.fill,
  transform: "translate(-50%, -50%)",
  pointerEvents: "none",
});

/** Keeps the spotlight's outline inside the pad's circle. */
export const poolClip = style({
  position: "absolute",
  inset: 0,
  borderRadius: vars.radius.full,
  overflow: "hidden",
  pointerEvents: "none",
});

/**
 * Where a spotlight lands, across the pad from the light: the pad stands for
 * the board, so the pool is drawn at its size there.
 */
export const pool = style({
  position: "absolute",
  left: poolLeft,
  top: poolTop,
  inlineSize: poolWidth,
  blockSize: poolHeight,
  transform: poolTransform,
  border: `${vars.borderWidth.thick} dashed ${vars.illustration.lamp.poolEdge}`,
  borderRadius: vars.radius.full,
  background: vars.illustration.lamp.pool,
});

/** The pad's corner buttons sit half off it, over its edge. */
const corner = {
  position: "absolute",
  top: `calc(-1 * ${vars.space.xs})`,
} as const;

export const info = style({
  ...corner,
  left: `calc(-1 * ${vars.space.xs})`,
});

export const reset = style([
  focusRing,
  {
    ...corner,
    right: `calc(-1 * ${vars.space.xs})`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: vars.space.xl,
    blockSize: vars.space.xl,
    padding: 0,
    border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
    borderRadius: vars.radius.full,
    background: vars.surface.page,
    color: vars.text.default,
    cursor: "pointer",
    "@media": hover({
      "&:hover": { borderColor: vars.action.primary.bg },
    }),
  },
]);

/** An icon over an upright slider as tall as the pad. */
export const heightSlider = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.xs,
});

/**
 * The slider's track: the pad's height less the icon above it and the gap
 * between them, which together are `space.lg`.
 */
const trackLength = `calc(${pad} - ${vars.space.lg})`;

export const uprightTrack = style({
  position: "relative",
  inlineSize: vars.space.lg,
  blockSize: trackLength,
});

/**
 * A range input turned upright, as wide as the track is tall; writing-mode
 * would do it without the turn, but not before Chrome 124.
 */
export const uprightInput = style({
  position: "absolute",
  left: "50%",
  top: "50%",
  inlineSize: trackLength,
  margin: 0,
  transform: "translate(-50%, -50%) rotate(-90deg)",
});

export const slider = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
});

export const sliderInput = style({
  flex: 1,
  margin: 0,
});

/** The swatches and their icon; as wide as the pad and height slider. */
export const colourRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space.sm,
  maxInlineSize: `calc(${pad} + ${vars.space.xxl})`,
});
