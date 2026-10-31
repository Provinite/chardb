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
  const mainSize = vertical ? floating.height : floating.width;
  const mainLimit = vertical ? viewport.height : viewport.width;

  /** The room on one side of the anchor, between it (and the gap) and the margin. */
  const room = (side: Side) => {
    switch (side) {
      case "bottom":
        return mainLimit - margin - (anchor.top + anchor.height + gap);
      case "top":
        return anchor.top - gap - margin;
      case "right":
        return mainLimit - margin - (anchor.left + anchor.width + gap);
      case "left":
        return anchor.left - gap - margin;
    }
  };
  const fits = (side: Side) => mainSize <= room(side);

  const side =
    !fits(preferred) && fits(OPPOSITE[preferred])
      ? OPPOSITE[preferred]
      : preferred;

  // What it measures once capped to the room it has, on the main axis.
  const mainRoom = Math.max(0, room(side));
  const mainShown = Math.min(mainSize, mainRoom);
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
