export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

/**
 * What to do when it fits on no side it may use, as floating-ui names it:
 * `bestFit` takes the side where least of it runs off the screen (for two
 * opposite sides, the one with more room); `initialPlacement` stays on the
 * preferred side. Either way it is then capped to the room it has.
 */
export type FallbackStrategy = "bestFit" | "initialPlacement";

export interface PlaceInput {
  /** The element it hangs from, in viewport coordinates. */
  anchor: { top: number; left: number; width: number; height: number };
  /** Its own size, uncapped. */
  floating: { width: number; height: number };
  viewport: { width: number; height: number };
  /** The side of the anchor it prefers. */
  side: Side;
  /**
   * The sides to try, in order, when it does not fit on `side`: the first
   * that fits wins. The opposite side by default; `[]` never moves it. Sides
   * only -- unlike floating-ui's placements, the alignment is `align`.
   */
  fallbackPlacements?: Side[];
  /** When it fits on none of them. `bestFit` by default. */
  fallbackStrategy?: FallbackStrategy;
  /** Where along that side: lined up with the anchor's start, centre or end. */
  align: Align;
  /** Space between the anchor and it. */
  gap: number;
  /** Space it keeps from the viewport's edges. */
  margin: number;
  /** How close to its corners an arrow may sit. */
  arrowInset?: number;
}

export interface Placement {
  /** Viewport coordinates of its top-left corner, for `position: fixed`. */
  top: number;
  left: number;
  /** The side it ended up on. */
  side: Side;
  /** Where an arrow points at the anchor's centre, from its start edge. */
  arrow: number;
  /**
   * The most it may measure to stay on screen. Along the side it sits on, the
   * room between the anchor and the margin; across it, the viewport less both
   * margins. Larger than it is when it fits; the cap to scroll inside when not.
   */
  maxWidth: number;
  maxHeight: number;
}

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const isVertical = (side: Side) => side === "top" || side === "bottom";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

/**
 * Where something floating beside an anchor goes, so it stays on screen.
 *
 * On its preferred side if it fits there; otherwise on the first of its
 * fallback sides that fits; otherwise as its fallback strategy says, capped to
 * the room it has. Along that side it lines up with the anchor as asked, then
 * slides to stay inside the margin, and its arrow keeps pointing at the
 * anchor's centre. floating-ui's `flip`, `shift` and `size`, by their names.
 */
export function placeFloating({
  anchor,
  floating,
  viewport,
  side: preferred,
  fallbackPlacements = [OPPOSITE[preferred]],
  fallbackStrategy = "bestFit",
  align,
  gap,
  margin,
  arrowInset = 0,
}: PlaceInput): Placement {
  /** Its size along the axis that leads away from the anchor on `side`. */
  const depth = (side: Side) =>
    isVertical(side) ? floating.height : floating.width;

  /** The room on one side of the anchor, between it (and the gap) and the margin. */
  const room = (side: Side) => {
    switch (side) {
      case "bottom":
        return viewport.height - margin - (anchor.top + anchor.height + gap);
      case "top":
        return anchor.top - gap - margin;
      case "right":
        return viewport.width - margin - (anchor.left + anchor.width + gap);
      case "left":
        return anchor.left - gap - margin;
    }
  };
  const fits = (side: Side) => depth(side) <= room(side);

  const candidates = [preferred, ...fallbackPlacements];
  const side =
    candidates.find(fits) ??
    (fallbackStrategy === "initialPlacement"
      ? preferred
      : // The least of it off the screen; the first such, on a tie.
        candidates.reduce((best, s) =>
          depth(s) - room(s) < depth(best) - room(best) ? s : best,
        ));

  const vertical = isVertical(side);

  // What it measures once capped to the room it has, on the main axis.
  const mainRoom = Math.max(0, room(side));
  const mainShown = Math.min(depth(side), mainRoom);
  const main =
    side === "bottom"
      ? anchor.top + anchor.height + gap
      : side === "top"
        ? anchor.top - gap - mainShown
        : side === "right"
          ? anchor.left + anchor.width + gap
          : anchor.left - gap - mainShown;

  // The cross axis: along the side it sits on. Capped to the viewport less
  // both margins, so wider than the screen it starts at the margin.
  const anchorStart = vertical ? anchor.left : anchor.top;
  const anchorSize = vertical ? anchor.width : anchor.height;
  const crossLimit = vertical ? viewport.width : viewport.height;
  const crossRoom = Math.max(0, crossLimit - 2 * margin);
  const crossSize = Math.min(
    vertical ? floating.width : floating.height,
    crossRoom,
  );
  const aligned =
    align === "start"
      ? anchorStart
      : align === "end"
        ? anchorStart + anchorSize - crossSize
        : anchorStart + anchorSize / 2 - crossSize / 2;
  const cross = Math.max(
    margin,
    Math.min(aligned, crossLimit - crossSize - margin),
  );
  const arrow = clamp(
    anchorStart + anchorSize / 2 - cross,
    arrowInset,
    crossSize - arrowInset,
  );

  return vertical
    ? {
        top: main,
        left: cross,
        side,
        arrow,
        maxWidth: crossRoom,
        maxHeight: mainRoom,
      }
    : {
        top: cross,
        left: main,
        side,
        arrow,
        maxWidth: mainRoom,
        maxHeight: crossRoom,
      };
}
