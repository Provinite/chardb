export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

export interface PlaceInput {
  /** The element it hangs from, in viewport coordinates. */
  anchor: { top: number; left: number; width: number; height: number };
  /** Its own size. */
  floating: { width: number; height: number };
  viewport: { width: number; height: number };
  /** The side of the anchor it prefers. */
  side: Side;
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
  /** The side it ended up on, after flipping. */
  side: Side;
  /** Where an arrow points at the anchor's centre, from its start edge. */
  arrow: number;
}

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

/**
 * Where something floating beside an anchor goes, so it stays on screen.
 *
 * On its preferred side unless that runs off the screen and the opposite side
 * does not; when neither fits it stays where it was asked to be. Along that
 * side it lines up with the anchor as asked, then slides to stay inside the
 * margin, and its arrow keeps pointing at the anchor's centre. The same moves
 * floating-ui calls `flip` and `shift`.
 */
export function placeFloating({
  anchor,
  floating,
  viewport,
  side: preferred,
  align,
  gap,
  margin,
  arrowInset = 0,
}: PlaceInput): Placement {
  const vertical = preferred === "top" || preferred === "bottom";

  /** Its start on the main axis, on one side of the anchor. */
  const mainStart = (side: Side) => {
    switch (side) {
      case "bottom":
        return anchor.top + anchor.height + gap;
      case "top":
        return anchor.top - gap - floating.height;
      case "right":
        return anchor.left + anchor.width + gap;
      case "left":
        return anchor.left - gap - floating.width;
    }
  };
  const mainSize = vertical ? floating.height : floating.width;
  const mainLimit = vertical ? viewport.height : viewport.width;
  const fits = (side: Side) => {
    const start = mainStart(side);
    return start >= margin && start + mainSize <= mainLimit - margin;
  };

  const side =
    !fits(preferred) && fits(OPPOSITE[preferred])
      ? OPPOSITE[preferred]
      : preferred;

  // The cross axis: along the side it sits on.
  const anchorStart = vertical ? anchor.left : anchor.top;
  const anchorSize = vertical ? anchor.width : anchor.height;
  const crossSize = vertical ? floating.width : floating.height;
  const crossLimit = vertical ? viewport.width : viewport.height;
  const aligned =
    align === "start"
      ? anchorStart
      : align === "end"
        ? anchorStart + anchorSize - crossSize
        : anchorStart + anchorSize / 2 - crossSize / 2;
  // Wider than the screen, it starts at the margin and runs off the far end.
  const cross = Math.max(
    margin,
    Math.min(aligned, crossLimit - crossSize - margin),
  );
  const arrow = clamp(
    anchorStart + anchorSize / 2 - cross,
    arrowInset,
    crossSize - arrowInset,
  );

  const main = mainStart(side);
  return vertical
    ? { top: main, left: cross, side, arrow }
    : { top: cross, left: main, side, arrow };
}
