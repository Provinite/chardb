import React, { useRef, useState } from "react";
import styled, { css } from "styled-components";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  type LucideIcon,
} from "lucide-react";
import { Tooltip } from "../Tooltip";
import {
  BOARD_ASPECT,
  CANDY_SIZE,
  SCALE_MAX,
  SCALE_MIN,
  candyImageUrl,
  candyName,
  pointOnBoard,
  trayGroups,
  type BoardAction,
  type Placement,
  type Point,
} from "./candyBoard";

/**
 * A candy board, and when `onAction` is given, the tools to arrange it: tap a
 * candy in the tray to stick it in the middle or, with a mouse, drag it onto
 * the board; drag candies around; and rotate, scale, raise or remove the
 * selected one, with its handles, the sliders or the keyboard.
 *
 * The board is night-time art rather than page chrome, so it keeps its own
 * colours in both themes.
 */

export interface BoardCandy {
  knockEventId: number;
  slug: string;
}

const CENTRE: Point = { x: 0.5, y: 0.5 };
/** How far a pointer moves before a press on the tray becomes a drag. */
const DRAG_THRESHOLD_PX = 5;
const NUDGE = 0.01;
const BIG_NUDGE = 0.05;

/**
 * The board's box. Not clipped, so the selected candy's handles can reach
 * past the edge; the candies themselves are clipped by the surface inside.
 */
const Board = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: ${BOARD_ASPECT};
  user-select: none;
`;

/** The night sky the candies are stuck on, cut off at its edges. */
const Surface = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background:
    radial-gradient(ellipse at 50% 120%, #f9731655 0%, #f9731600 55%),
    radial-gradient(circle at 82% 16%, #fde68a 0 3.5%, #fde68a00 4%),
    linear-gradient(180deg, #1e1b4b 0%, #3b0764 70%, #431407 100%);
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

/** Places, sizes and rotates one candy's picture. */
const CandyFrame = styled.div`
  position: absolute;
  transform-origin: center;
`;

/**
 * The selected candy's outline and handles, laid over it with the same
 * place, size and rotation. A layer of its own, drawn after every candy:
 * inside the candy's frame, a candy higher in the pile would cover them. Only
 * the handles take the pointer; a press anywhere else in the outline reaches
 * whatever candy is under it.
 */
const SelectionFrame = styled.div`
  position: absolute;
  transform-origin: center;
  outline: 2px dashed #fde68a;
  outline-offset: 4px;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;

const Candy = styled.img<{ $editable: boolean }>`
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 4px 6px #00000066);
  -webkit-user-drag: none;
  ${({ $editable }) =>
    $editable &&
    css`
      cursor: grab;
      /* Only a candy and its handles take touches for dragging: anywhere
         else on the board, a swipe still scrolls the page. */
      touch-action: none;
      &:active {
        cursor: grabbing;
      }
    `}
  &:focus-visible {
    outline: 2px solid #fde68a;
    outline-offset: 4px;
  }
`;

/** Where a candy, or the selection over it, sits on the board. */
const placementStyle = (p: Placement): React.CSSProperties => ({
  left: `${p.x * 100}%`,
  top: `${p.y * 100}%`,
  width: `${CANDY_SIZE * p.scale * 100}%`,
  transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
});

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNERS: Corner[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

/** Drags a candy bigger or smaller, about its centre. */
const ScaleHandle = styled.div<{ $corner: Corner }>`
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid #1e1b4b;
  border-radius: 2px;
  background: #fde68a;
  touch-action: none;
  ${({ $corner }) => {
    const [y, x] = $corner.split("-");
    return css`
      ${y}: -10px;
      ${x}: -10px;
      cursor: ${$corner === "top-left" || $corner === "bottom-right"
        ? "nwse-resize"
        : "nesw-resize"};
    `;
  }}
`;

/**
 * A circular arrow: CSS has no rotate cursor of its own. Dark with a light
 * edge, so it shows on the night sky and off it.
 */
const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<g stroke="#ffffff" stroke-width="4"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4h-4"/></g>' +
    '<g stroke="#1e1b4b" stroke-width="2"><path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v4h-4"/></g>' +
    "</svg>",
)}") 12 12, grab`;

/**
 * Drags a candy round its centre. It sits above the top edge, on a stem; the
 * dot is small, but the box that takes the pointer around it is 36px.
 */
const RotateHandle = styled.div`
  position: absolute;
  top: -50px;
  left: 50%;
  width: 36px;
  height: 36px;
  margin-left: -18px;
  cursor: ${ROTATE_CURSOR};
  touch-action: none;

  /* The dot. */
  &::before {
    content: "";
    position: absolute;
    top: 10px;
    left: 10px;
    width: 12px;
    height: 12px;
    border: 2px solid #1e1b4b;
    border-radius: 50%;
    background: #fde68a;
  }

  /* The stem down to the candy's top edge. */
  &::after {
    content: "";
    position: absolute;
    top: 26px;
    left: 17px;
    width: 2px;
    height: 20px;
    background: #fde68a;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  label {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
  }

  label:has(input:disabled) {
    opacity: 0.5;
  }
`;

const ToolButton = styled.button`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LayerButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const IconButton = styled(ToolButton)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xs};
`;

/** The four ways to move the selected candy through the pile, top first. */
const LAYER_MOVES: {
  label: string;
  Icon: LucideIcon;
  /** Whether it moves the candy up the pile, so the top one cannot. */
  upward: boolean;
  action: (knockEventId: number) => BoardAction;
}[] = [
  {
    label: "Bring to front",
    Icon: ArrowUpToLine,
    upward: true,
    action: (knockEventId) => ({ raise: { knockEventId } }),
  },
  {
    label: "Bring forward",
    Icon: ArrowUp,
    upward: true,
    action: (knockEventId) => ({ forward: { knockEventId } }),
  },
  {
    label: "Send backward",
    Icon: ArrowDown,
    upward: false,
    action: (knockEventId) => ({ backward: { knockEventId } }),
  },
  {
    label: "Send to back",
    Icon: ArrowDownToLine,
    upward: false,
    action: (knockEventId) => ({ lower: { knockEventId } }),
  },
];

const TrayTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: ${({ theme }) => theme.spacing.xl} 0
    ${({ theme }) => theme.spacing.sm};
`;

const TrayHint = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
`;

const Tray = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
  list-style: none;
  margin: 0;
  padding: 0;
`;

const TrayItem = styled.button`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  cursor: grab;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
  }
`;

const Count = styled.span`
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 1.5rem;
  padding: 0 0.35rem;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: 1.5rem;
`;

const Ghost = styled.img`
  position: fixed;
  width: 72px;
  height: auto;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.85;
  z-index: 1000;
`;

interface CandyBoardProps {
  candies: BoardCandy[];
  placements: Placement[];
  /** Absent for someone else's board, which is only looked at. */
  onAction?: (action: BoardAction) => void;
  /** Called while a candy is being dragged, so saving can wait for the drop. */
  onDraggingChange?: (dragging: boolean) => void;
}

export const CandyBoard: React.FC<CandyBoardProps> = ({
  candies,
  placements,
  onAction,
  onDraggingChange,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  /**
   * Width over height of each candy's picture, once loaded, so the selection
   * outline is the picture's shape: the pictures are not all square.
   */
  const [aspects, setAspects] = useState<Record<string, number>>({});
  /**
   * A candy on the board being moved, scaled or rotated, and by which
   * pointer. Other pointers -- a second finger -- are ignored.
   */
  const drag = useRef<
    | { mode: "move"; id: number; pointerId: number; offset: Point }
    | {
        mode: "scale";
        id: number;
        pointerId: number;
        /** The candy's centre, in client pixels. */
        centre: Point;
        startDistance: number;
        startScale: number;
      }
    | { mode: "rotate"; id: number; pointerId: number; centre: Point }
    | null
  >(null);
  /** A candy being dragged out of the tray, with a mouse or pen. */
  const [trayDrag, setTrayDrag] = useState<{
    id: number;
    slug: string;
    pointerId: number;
    start: Point;
    at: Point;
    moved: boolean;
  } | null>(null);
  const draggedFromTray = useRef(false);

  const editable = Boolean(onAction);
  const slugs = new Map(candies.map((c) => [c.knockEventId, c.slug]));
  const selectedPlacement = placements.find((p) => p.knockEventId === selected);

  const boardPoint = (clientX: number, clientY: number): Point | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return pointOnBoard(clientX, clientY, rect);
  };

  const setDragging = (dragging: boolean) => onDraggingChange?.(dragging);

  const startMove = (e: React.PointerEvent<HTMLImageElement>, p: Placement) => {
    if (!onAction || drag.current) return;
    // Stops the browser's own image drag, and with it the focus a press
    // would give; focusing by hand keeps the keyboard shortcuts on this one.
    e.preventDefault();
    e.currentTarget.focus();
    setSelected(p.knockEventId);
    const point = boardPoint(e.clientX, e.clientY);
    drag.current = {
      mode: "move",
      id: p.knockEventId,
      pointerId: e.pointerId,
      offset: point ? { x: point.x - p.x, y: point.y - p.y } : { x: 0, y: 0 },
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  /** Where a placed candy's centre is on screen, if the board is laid out. */
  const centreOf = (p: Placement): Point | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: rect.left + p.x * rect.width,
      y: rect.top + p.y * rect.height,
    };
  };

  const startHandle = (
    e: React.PointerEvent<HTMLDivElement>,
    p: Placement,
    mode: "scale" | "rotate",
  ) => {
    if (!onAction || drag.current) return;
    e.preventDefault();
    e.stopPropagation();
    const centre = centreOf(p);
    if (!centre) return;
    const id = p.knockEventId;
    const pointerId = e.pointerId;
    if (mode === "scale") {
      const startDistance = Math.hypot(
        e.clientX - centre.x,
        e.clientY - centre.y,
      );
      if (startDistance === 0) return;
      drag.current = {
        mode,
        id,
        pointerId,
        centre,
        startDistance,
        startScale: p.scale,
      };
    } else {
      drag.current = { mode, id, pointerId, centre };
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const move = (e: React.PointerEvent) => {
    const current = drag.current;
    if (!onAction || current?.pointerId !== e.pointerId) return;
    const knockEventId = current.id;
    if (current.mode === "move") {
      const point = boardPoint(e.clientX, e.clientY);
      if (!point) return;
      onAction({
        edit: {
          knockEventId,
          x: point.x - current.offset.x,
          y: point.y - current.offset.y,
        },
      });
    } else if (current.mode === "scale") {
      const distance = Math.hypot(
        e.clientX - current.centre.x,
        e.clientY - current.centre.y,
      );
      // Clamped here, not left to the board: the server refuses a scale
      // outside these, and would refuse the whole save with it.
      const scale = Math.min(
        SCALE_MAX,
        Math.max(
          SCALE_MIN,
          (current.startScale * distance) / current.startDistance,
        ),
      );
      onAction({ edit: { knockEventId, scale } });
    } else {
      // The handle sits straight above the centre, so pointing up is 0deg.
      const degrees =
        (Math.atan2(
          e.clientY - current.centre.y,
          e.clientX - current.centre.x,
        ) *
          180) /
          Math.PI +
        90;
      const snapped = e.shiftKey ? Math.round(degrees / 15) * 15 : degrees;
      // Into (-180, 180], as the server takes it.
      const rotation = snapped > 180 ? snapped - 360 : snapped;
      onAction({ edit: { knockEventId, rotation: Math.round(rotation) } });
    }
  };

  const endMove = (e: React.PointerEvent) => {
    if (drag.current?.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  const place = (id: number, point: Point) => {
    if (!onAction) return;
    onAction({ add: { knockEventId: id, ...point, rotation: 0, scale: 1 } });
    setSelected(id);
  };

  const startTrayDrag = (e: React.PointerEvent, id: number, slug: string) => {
    // On a touch screen a tray candy is only tapped: a swipe across the tray
    // has to scroll the page.
    if (e.pointerType === "touch" || trayDrag) return;
    const at = { x: e.clientX, y: e.clientY };
    setTrayDrag({
      id,
      slug,
      pointerId: e.pointerId,
      start: at,
      at,
      moved: false,
    });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const moveTrayDrag = (e: React.PointerEvent) => {
    if (trayDrag?.pointerId !== e.pointerId) return;
    const at = { x: e.clientX, y: e.clientY };
    const moved =
      trayDrag.moved ||
      Math.hypot(at.x - trayDrag.start.x, at.y - trayDrag.start.y) >
        DRAG_THRESHOLD_PX;
    setTrayDrag({ ...trayDrag, at, moved });
  };

  const endTrayDrag = (e: React.PointerEvent) => {
    if (trayDrag?.pointerId !== e.pointerId) return;
    const { id, moved } = trayDrag;
    setTrayDrag(null);
    if (!moved) {
      // A tap: the click that follows sticks it in the middle.
      return;
    }
    // A drag can end in a click too, which must not place a second candy. It
    // comes straight after this pointerup or not at all, so the guard lasts
    // only until then: left up, it would swallow the next real tap.
    draggedFromTray.current = true;
    setTimeout(() => {
      draggedFromTray.current = false;
    }, 0);
    const rect = boardRef.current?.getBoundingClientRect();
    const over =
      rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    const point = over ? boardPoint(e.clientX, e.clientY) : null;
    if (point) place(id, point);
  };

  const onCandyKey = (e: React.KeyboardEvent, p: Placement) => {
    if (!onAction) return;
    const step = e.shiftKey ? BIG_NUDGE : NUDGE;
    const id = p.knockEventId;
    const edit = (
      changes: Partial<Omit<Placement, "knockEventId">>,
    ): BoardAction => ({ edit: { knockEventId: id, ...changes } });
    const keys: Record<string, () => BoardAction> = {
      ArrowLeft: () => edit({ x: p.x - step }),
      ArrowRight: () => edit({ x: p.x + step }),
      ArrowUp: () => edit({ y: p.y - step }),
      ArrowDown: () => edit({ y: p.y + step }),
      "[": () => edit({ rotation: p.rotation - 15 }),
      "]": () => edit({ rotation: p.rotation + 15 }),
      "-": () => edit({ scale: p.scale - 0.1 }),
      "=": () => edit({ scale: p.scale + 0.1 }),
      Delete: () => ({ remove: { knockEventId: id } }),
      Backspace: () => ({ remove: { knockEventId: id } }),
    };
    const action = keys[e.key];
    if (!action) return;
    e.preventDefault();
    onAction(action());
  };

  const selectedIndex = selectedPlacement
    ? placements.indexOf(selectedPlacement)
    : -1;
  const atTop = selectedIndex === placements.length - 1;
  const atBottom = selectedIndex === 0;

  /** An action on the selected candy, if one is selected. */
  const actOnSelected = (make: (knockEventId: number) => BoardAction) => {
    if (onAction && selectedPlacement) {
      onAction(make(selectedPlacement.knockEventId));
    }
  };

  const groups = trayGroups(candies, placements);

  return (
    <>
      <Board
        ref={boardRef}
        role="region"
        aria-label="Candy board"
        onPointerMove={move}
        onPointerUp={endMove}
        onPointerCancel={endMove}
        onPointerDown={(e) => {
          if (e.target === surfaceRef.current) setSelected(null);
        }}
      >
        <Surface ref={surfaceRef}>
          {placements.map((p) => {
            const slug = slugs.get(p.knockEventId);
            if (!slug) return null;
            return (
              <CandyFrame key={p.knockEventId} style={placementStyle(p)}>
                <Candy
                  src={candyImageUrl(slug)}
                  alt={candyName(slug)}
                  draggable={false}
                  $editable={editable}
                  tabIndex={editable ? 0 : undefined}
                  onPointerDown={(e) => startMove(e, p)}
                  onFocus={() => editable && setSelected(p.knockEventId)}
                  onKeyDown={(e) => onCandyKey(e, p)}
                  onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.currentTarget;
                    if (naturalWidth && naturalHeight) {
                      setAspects((known) =>
                        known[slug]
                          ? known
                          : { ...known, [slug]: naturalWidth / naturalHeight },
                      );
                    }
                  }}
                />
              </CandyFrame>
            );
          })}
        </Surface>
        {editable && selectedPlacement && (
          <SelectionFrame
            style={{
              ...placementStyle(selectedPlacement),
              aspectRatio:
                aspects[slugs.get(selectedPlacement.knockEventId) ?? ""] ?? 1,
            }}
          >
            {CORNERS.map((corner) => (
              <ScaleHandle
                key={corner}
                $corner={corner}
                aria-label={`Scale from ${corner} corner`}
                onPointerDown={(e) =>
                  startHandle(e, selectedPlacement, "scale")
                }
              />
            ))}
            <RotateHandle
              aria-label="Rotate candy"
              onPointerDown={(e) => startHandle(e, selectedPlacement, "rotate")}
            />
          </SelectionFrame>
        )}
      </Board>

      {/* Always there for the owner, so the board does not jump when a candy
          is picked; with none picked, there is nothing for it to act on. */}
      {onAction && (
        <Toolbar aria-label="Selected candy">
          <label>
            Rotate
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              disabled={!selectedPlacement}
              value={selectedPlacement?.rotation ?? 0}
              onChange={(e) =>
                actOnSelected((knockEventId) => ({
                  edit: { knockEventId, rotation: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label>
            Scale
            <input
              type="range"
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={0.05}
              disabled={!selectedPlacement}
              value={selectedPlacement?.scale ?? 1}
              onChange={(e) =>
                actOnSelected((knockEventId) => ({
                  edit: { knockEventId, scale: Number(e.target.value) },
                }))
              }
            />
          </label>
          <LayerButtons role="group" aria-label="Layer">
            {LAYER_MOVES.map(({ label, Icon, upward, action }) => {
              // Nothing above the top candy to pass, nothing below the bottom.
              const stuck = upward ? atTop : atBottom;
              return (
                <Tooltip key={label} label={label}>
                  <IconButton
                    type="button"
                    aria-label={label}
                    disabled={!selectedPlacement || stuck}
                    onClick={() => actOnSelected(action)}
                  >
                    <Icon size={18} aria-hidden />
                  </IconButton>
                </Tooltip>
              );
            })}
          </LayerButtons>
          <ToolButton
            type="button"
            disabled={!selectedPlacement}
            onClick={() => {
              actOnSelected((knockEventId) => ({ remove: { knockEventId } }));
              setSelected(null);
            }}
          >
            Back to tray
          </ToolButton>
        </Toolbar>
      )}

      {onAction && (
        <section aria-label="Your candies">
          <TrayTitle>Your candies</TrayTitle>
          <TrayHint>
            {candies.length === 0
              ? "No candies yet. Each /knock where no one is home gives you one."
              : groups.length === 0
                ? "Every candy you have is on the board."
                : "Tap a candy to stick it on the board, or drag it where you want it."}
          </TrayHint>
          <Tray>
            {groups.map(({ slug, knockEventIds }) => (
              <li key={slug}>
                <TrayItem
                  type="button"
                  aria-label={`Place ${candyName(slug)} (${knockEventIds.length} left)`}
                  onPointerDown={(e) =>
                    startTrayDrag(e, knockEventIds[0], slug)
                  }
                  onPointerMove={moveTrayDrag}
                  onPointerUp={endTrayDrag}
                  onPointerCancel={() => setTrayDrag(null)}
                  onClick={() => {
                    if (draggedFromTray.current) {
                      draggedFromTray.current = false;
                      return;
                    }
                    place(knockEventIds[0], CENTRE);
                  }}
                >
                  <img src={candyImageUrl(slug)} alt="" draggable={false} />
                  {knockEventIds.length > 1 && (
                    <Count>{knockEventIds.length}</Count>
                  )}
                </TrayItem>
              </li>
            ))}
          </Tray>
        </section>
      )}

      {trayDrag?.moved && (
        <Ghost
          src={candyImageUrl(trayDrag.slug)}
          alt=""
          style={{ left: trayDrag.at.x, top: trayDrag.at.y }}
        />
      )}
    </>
  );
};
