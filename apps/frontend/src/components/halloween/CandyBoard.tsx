import React, { useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  RotateCw,
  Scaling,
  X,
  type LucideIcon,
} from "lucide-react";
import { Tooltip } from "../Tooltip";
import {
  SURFACE_COLOUR,
  backgroundOf,
  backgroundStyle,
} from "./boardBackgrounds";
import type { BackgroundEffects } from "./backgroundEffects";
import { BackgroundEffectLayers } from "./BackgroundEffectLayers";
import { shadowFilter, type Lighting } from "./candyLighting";
import { LightLayers } from "./LightLayers";
import { nameplateUrl, stickerSize } from "./nameplate";
import { formatBoardName, type BoardName } from "./boardName";
import {
  candiesAt,
  maskFromImage,
  nextSelection,
  type AlphaMask,
} from "./candyHitTest";
import {
  BOARD_ASPECT,
  NAMEPLATE,
  NAMEPLATE_KEY,
  SCALE_MAX,
  SCALE_MIN,
  candyImageUrl,
  candyName,
  candySticker,
  pointOnBoard,
  stickerFromKey,
  stickerKey,
  trayGroups,
  type BoardAction,
  type Placement,
  type Point,
  type Sticker,
  type StickerKey,
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
  /* What the candies' shadows are measured against (cqw), so a board looks
     the same at any width. */
  container-type: inline-size;
`;

/** The background the candies are stuck on, cut off at its edges. */
const Surface = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  /* Under the background's picture, set inline, while it loads. */
  background-color: ${SURFACE_COLOUR};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  /* So a tint blends with the background alone. */
  isolation: isolate;
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
  -webkit-user-drag: none;
  /* The board picks the cursor, from what is under the pointer: over a
     candy's see-through corner it is not over that candy. */
  ${({ $editable }) =>
    $editable &&
    css`
      /* Only a candy's box and its handles take touches for dragging:
         anywhere else on the board, a swipe still scrolls the page. */
      touch-action: none;
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
  width: `${stickerSize(p.sticker) * p.scale * 100}%`,
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
 * edge, so it shows on dark backgrounds and light ones.
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
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.md};

  label {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing.sm};
  }

  input[type="range"] {
    width: 160px;
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
  gap: ${({ theme }) => theme.spacing.sm};
`;

/** Square, and big enough to hit without aiming. */
const IconButton = styled(ToolButton)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
`;

/** The icons in the toolbar's buttons. */
const ICON_SIZE = 22;

/** The four ways to move the selected candy through the pile, top first. */
const LAYER_MOVES: {
  label: string;
  Icon: LucideIcon;
  /** Whether it moves the candy up the pile, so the top one cannot. */
  upward: boolean;
  action: (sticker: Sticker) => BoardAction;
}[] = [
  {
    label: "Bring to front",
    Icon: ArrowUpToLine,
    upward: true,
    action: (sticker) => ({ raise: sticker }),
  },
  {
    label: "Bring forward",
    Icon: ArrowUp,
    upward: true,
    action: (sticker) => ({ forward: sticker }),
  },
  {
    label: "Send backward",
    Icon: ArrowDown,
    upward: false,
    action: (sticker) => ({ backward: sticker }),
  },
  {
    label: "Send to back",
    Icon: ArrowDownToLine,
    upward: false,
    action: (sticker) => ({ lower: sticker }),
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

/** The nameplate's place in the tray: two candies wide, as it is long. */
const WideSlot = styled.li`
  grid-column: span 2;
`;

const TrayItem = styled.button<{ $wide?: boolean }>`
  position: relative;
  width: 100%;
  aspect-ratio: ${({ $wide }) => ($wide ? 2 : 1)};
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
  /** The picture or tile behind the candies; none for graph paper. */
  background?: string | null;
  /** How the background is dimmed and tinted; none for neither. */
  backgroundEffects?: BackgroundEffects | null;
  /** The light that casts the candies' shadows; none for the default. */
  lighting?: Lighting | null;
  /** The board's name, for its nameplate; none for a board not named. */
  name?: BoardName | null;
}

/** What a placed sticker is drawn with: a candy, or the nameplate. */
interface StickerPicture {
  /** What its picture's shape is remembered by. */
  key: string;
  src: string;
  alt: string;
  /** Whether its see-through parts let a press through; the nameplate's do not. */
  masked: boolean;
}

export const CandyBoard: React.FC<CandyBoardProps> = ({
  candies,
  placements,
  onAction,
  onDraggingChange,
  background,
  backgroundEffects,
  lighting,
  name,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<StickerKey | null>(null);
  // The board, its toolbar and its tray; a press anywhere else on the page
  // lets go of the selected candy.
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected === null) return;
    const pressed = (e: PointerEvent) => {
      if (e.target instanceof Node && !editorRef.current?.contains(e.target)) {
        setSelected(null);
      }
    };
    document.addEventListener("pointerdown", pressed);
    return () => document.removeEventListener("pointerdown", pressed);
  }, [selected]);
  /**
   * What each kind of candy's picture is like, once loaded: its shape, so the
   * selection outline fits it, and its alpha mask, so a press can pass
   * through its see-through parts.
   */
  const [pictures, setPictures] = useState<
    Record<string, { aspect: number; mask: AlphaMask | null }>
  >({});
  /** Each placed candy's picture, to focus the one a press selects. */
  const candyImages = useRef(new Map<StickerKey, HTMLImageElement>());
  /** Whether the pointer is over a candy, for the cursor. */
  const [overCandy, setOverCandy] = useState(false);
  /**
   * A candy on the board being moved, scaled or rotated, and by which
   * pointer. Other pointers -- a second finger -- are ignored.
   */
  const drag = useRef<
    | {
        mode: "move";
        id: StickerKey;
        pointerId: number;
        offset: Point;
        /** Where the press began, in client pixels. */
        start: Point;
        /** Past the drag threshold: until then it may still be a click. */
        moved: boolean;
        /**
         * The candies under a press on the already-selected candy, top
         * first: released without moving, it picks the next one down.
         */
        cycle: StickerKey[] | null;
      }
    | {
        mode: "scale";
        id: StickerKey;
        pointerId: number;
        /** The candy's centre, in client pixels. */
        centre: Point;
        startDistance: number;
        startScale: number;
      }
    | { mode: "rotate"; id: StickerKey; pointerId: number; centre: Point }
    | null
  >(null);
  /** A candy being dragged out of the tray, with a mouse or pen. */
  const [trayDrag, setTrayDrag] = useState<{
    sticker: Sticker;
    src: string;
    pointerId: number;
    start: Point;
    at: Point;
    moved: boolean;
  } | null>(null);
  const draggedFromTray = useRef(false);

  const editable = Boolean(onAction);
  const slugs = new Map(candies.map((c) => [c.knockEventId, c.slug]));
  const nameText = name ? formatBoardName(name) : null;
  const nameplateSrc = useMemo(
    () => (nameText ? nameplateUrl(nameText) : null),
    [nameText],
  );
  /** A placed sticker's picture; null for one with nothing to draw. */
  const pictureOf = (p: Placement): StickerPicture | null => {
    if (p.sticker.nameplate) {
      return nameText && nameplateSrc
        ? {
            key: `nameplate:${nameText}`,
            src: nameplateSrc,
            alt: `Nameplate: ${nameText}`,
            masked: false,
          }
        : null;
    }
    const slug = p.sticker.candy != null ? slugs.get(p.sticker.candy) : null;
    return slug
      ? {
          key: slug,
          src: candyImageUrl(slug),
          alt: candyName(slug),
          masked: true,
        }
      : null;
  };
  const placementOf = (key: StickerKey | null) =>
    placements.find((p) => stickerKey(p.sticker) === key);
  const selectedPlacement = placementOf(selected);
  const nameplatePlaced = placementOf(NAMEPLATE_KEY) !== undefined;

  const boardPoint = (clientX: number, clientY: number): Point | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return pointOnBoard(clientX, clientY, rect);
  };

  const setDragging = (dragging: boolean) => onDraggingChange?.(dragging);

  /**
   * The candies under a pointer, top first. When the board is not laid out
   * -- no size to measure against -- the candy the event came from stands in.
   */
  const candiesUnder = (e: React.PointerEvent): StickerKey[] => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      const key = (e.target as HTMLElement).dataset?.sticker;
      return key ? [key] : [];
    }
    const pile = placements.flatMap((placement) => {
      const shown = pictureOf(placement);
      if (!shown) return [];
      const picture = pictures[shown.key];
      return [
        {
          placement,
          aspect: picture?.aspect ?? 1,
          mask: picture?.mask ?? null,
        },
      ];
    });
    return candiesAt(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      rect,
      pile,
    );
  };

  const select = (id: StickerKey | null) => {
    setSelected(id);
    // Focused by hand: a press on the board does not focus the picture, and
    // the keyboard shortcuts act on the focused one.
    if (id !== null) candyImages.current.get(id)?.focus();
  };

  /**
   * A press on the board picks a candy -- the one on top under the pointer,
   * see-through parts aside -- and starts dragging it. A press on the
   * selected candy keeps it, so it can be dragged; let go without moving,
   * and the next candy down under the pointer is picked instead.
   */
  const press = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onAction || drag.current) return;
    const under = candiesUnder(e);
    if (under.length === 0) {
      setSelected(null);
      return;
    }
    const pressedSelected = selected !== null && under.includes(selected);
    const id = pressedSelected ? selected : under[0];
    const p = placementOf(id);
    if (!p) return;
    // Stops the browser's own image drag.
    e.preventDefault();
    select(id);
    const point = boardPoint(e.clientX, e.clientY);
    drag.current = {
      mode: "move",
      id,
      pointerId: e.pointerId,
      offset: point ? { x: point.x - p.x, y: point.y - p.y } : { x: 0, y: 0 },
      start: { x: e.clientX, y: e.clientY },
      moved: false,
      cycle: pressedSelected ? under : null,
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
    const id = stickerKey(p.sticker);
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
    if (!current) {
      // Not dragging: the cursor says whether a press here would take hold.
      if (onAction) {
        const over = candiesUnder(e).length > 0;
        if (over !== overCandy) setOverCandy(over);
      }
      return;
    }
    if (!onAction || current.pointerId !== e.pointerId) return;
    const sticker = stickerFromKey(current.id);
    if (current.mode === "move") {
      if (!current.moved) {
        const travelled = Math.hypot(
          e.clientX - current.start.x,
          e.clientY - current.start.y,
        );
        // A click's wobble moves nothing, and so saves nothing.
        if (travelled <= DRAG_THRESHOLD_PX) return;
        current.moved = true;
      }
      const point = boardPoint(e.clientX, e.clientY);
      if (!point) return;
      onAction({
        edit: {
          sticker,
          x: point.x - current.offset.x,
          y: point.y - current.offset.y,
        },
      });
    } else if (current.mode === "scale") {
      const distance = Math.hypot(
        e.clientX - current.centre.x,
        e.clientY - current.centre.y,
      );
      // Kept within the sizes the board allows by the sync, as every edit is.
      const scale = (current.startScale * distance) / current.startDistance;
      onAction({ edit: { sticker, scale } });
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
      onAction({ edit: { sticker, rotation: Math.round(rotation) } });
    }
  };

  const endMove = (e: React.PointerEvent) => {
    const current = drag.current;
    if (current?.pointerId !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (
      e.type === "pointerup" &&
      current.mode === "move" &&
      !current.moved &&
      current.cycle
    ) {
      select(nextSelection(current.cycle, current.id));
    }
  };

  const place = (sticker: Sticker, point: Point) => {
    if (!onAction) return;
    onAction({ add: { sticker, ...point, rotation: 0, scale: 1 } });
    setSelected(stickerKey(sticker));
  };

  const startTrayDrag = (
    e: React.PointerEvent,
    sticker: Sticker,
    src: string,
  ) => {
    // On a touch screen a tray candy is only tapped: a swipe across the tray
    // has to scroll the page.
    if (e.pointerType === "touch" || trayDrag) return;
    const at = { x: e.clientX, y: e.clientY };
    setTrayDrag({
      sticker,
      src,
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
    const { sticker, moved } = trayDrag;
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
    if (point) place(sticker, point);
  };

  const onCandyKey = (e: React.KeyboardEvent, p: Placement) => {
    if (!onAction) return;
    const step = e.shiftKey ? BIG_NUDGE : NUDGE;
    const sticker = stickerFromKey(stickerKey(p.sticker));
    const edit = (
      changes: Partial<Omit<Placement, "sticker">>,
    ): BoardAction => ({ edit: { sticker, ...changes } });
    const keys: Record<string, () => BoardAction> = {
      ArrowLeft: () => edit({ x: p.x - step }),
      ArrowRight: () => edit({ x: p.x + step }),
      ArrowUp: () => edit({ y: p.y - step }),
      ArrowDown: () => edit({ y: p.y + step }),
      "[": () => edit({ rotation: p.rotation - 15 }),
      "]": () => edit({ rotation: p.rotation + 15 }),
      "-": () => edit({ scale: p.scale - 0.1 }),
      "=": () => edit({ scale: p.scale + 0.1 }),
      Delete: () => ({ remove: sticker }),
      Backspace: () => ({ remove: sticker }),
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

  /** An action on the selected sticker, if one is selected. */
  const actOnSelected = (make: (sticker: Sticker) => BoardAction) => {
    if (onAction && selected !== null && selectedPlacement) {
      onAction(make(stickerFromKey(selected)));
    }
  };

  const groups = trayGroups(candies, placements);

  return (
    <div ref={editorRef}>
      <Board
        ref={boardRef}
        role="region"
        aria-label="Candy board"
        onPointerDown={press}
        onPointerMove={move}
        onPointerUp={endMove}
        onPointerCancel={endMove}
        onPointerLeave={() => setOverCandy(false)}
        style={{
          cursor: !editable
            ? undefined
            : drag.current?.mode === "move"
              ? "grabbing"
              : overCandy
                ? "grab"
                : undefined,
        }}
      >
        <Surface style={backgroundStyle(backgroundOf(background))}>
          <BackgroundEffectLayers effects={backgroundEffects ?? null} />
          {placements.map((p) => {
            const sticker = pictureOf(p);
            if (!sticker) return null;
            const key = stickerKey(p.sticker);
            return (
              <CandyFrame key={key} style={placementStyle(p)}>
                <Candy
                  src={sticker.src}
                  alt={sticker.alt}
                  draggable={false}
                  $editable={editable}
                  data-sticker={key}
                  style={{ filter: shadowFilter(lighting, p.rotation) }}
                  ref={(image) => {
                    if (image) candyImages.current.set(key, image);
                    else candyImages.current.delete(key);
                  }}
                  tabIndex={editable ? 0 : undefined}
                  onFocus={() => editable && setSelected(key)}
                  onKeyDown={(e) => onCandyKey(e, p)}
                  onLoad={(e) => {
                    const image = e.currentTarget;
                    const { naturalWidth, naturalHeight } = image;
                    if (!naturalWidth || !naturalHeight) return;
                    setPictures((known) =>
                      known[sticker.key]
                        ? known
                        : {
                            ...known,
                            [sticker.key]: {
                              aspect: naturalWidth / naturalHeight,
                              mask:
                                editable && sticker.masked
                                  ? maskFromImage(image)
                                  : null,
                            },
                          },
                    );
                  }}
                />
              </CandyFrame>
            );
          })}
          <LightLayers lighting={lighting ?? null} />
        </Surface>
        {editable && selectedPlacement && (
          <SelectionFrame
            style={{
              ...placementStyle(selectedPlacement),
              aspectRatio:
                pictures[pictureOf(selectedPlacement)?.key ?? ""]?.aspect ?? 1,
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
          <Tooltip label="Rotate">
            <label>
              <RotateCw size={ICON_SIZE} aria-hidden />
              <input
                type="range"
                aria-label="Rotate"
                min={-180}
                max={180}
                step={1}
                disabled={!selectedPlacement}
                value={selectedPlacement?.rotation ?? 0}
                onChange={(e) =>
                  actOnSelected((sticker) => ({
                    edit: { sticker, rotation: Number(e.target.value) },
                  }))
                }
              />
            </label>
          </Tooltip>
          <Tooltip label="Scale">
            <label>
              <Scaling size={ICON_SIZE} aria-hidden />
              <input
                type="range"
                aria-label="Scale"
                min={SCALE_MIN}
                max={SCALE_MAX}
                step={0.05}
                disabled={!selectedPlacement}
                value={selectedPlacement?.scale ?? 1}
                onChange={(e) =>
                  actOnSelected((sticker) => ({
                    edit: { sticker, scale: Number(e.target.value) },
                  }))
                }
              />
            </label>
          </Tooltip>
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
                    <Icon size={ICON_SIZE} aria-hidden />
                  </IconButton>
                </Tooltip>
              );
            })}
          </LayerButtons>
          {/* Back to the tray, as Delete or Backspace on the candy does. */}
          <Tooltip label="Remove sticker (Delete)">
            <IconButton
              type="button"
              aria-label="Remove sticker"
              disabled={!selectedPlacement}
              onClick={() => {
                actOnSelected((sticker) => ({ remove: sticker }));
                setSelected(null);
              }}
            >
              <X size={ICON_SIZE} aria-hidden />
            </IconButton>
          </Tooltip>
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
            {/* The nameplate, while the board has a name and it is not up. */}
            {editable && nameplateSrc && !nameplatePlaced && (
              <WideSlot>
                <TrayItem
                  type="button"
                  aria-label="Place nameplate"
                  $wide
                  onPointerDown={(e) =>
                    startTrayDrag(e, NAMEPLATE, nameplateSrc)
                  }
                  onPointerMove={moveTrayDrag}
                  onPointerUp={endTrayDrag}
                  onPointerCancel={() => setTrayDrag(null)}
                  onClick={() => {
                    if (draggedFromTray.current) {
                      draggedFromTray.current = false;
                      return;
                    }
                    place(NAMEPLATE, CENTRE);
                  }}
                >
                  <img src={nameplateSrc} alt="" draggable={false} />
                </TrayItem>
              </WideSlot>
            )}
            {groups.map(({ slug, knockEventIds }) => (
              <li key={slug}>
                <TrayItem
                  type="button"
                  aria-label={`Place ${candyName(slug)} (${knockEventIds.length} left)`}
                  onPointerDown={(e) =>
                    startTrayDrag(
                      e,
                      candySticker(knockEventIds[0]),
                      candyImageUrl(slug),
                    )
                  }
                  onPointerMove={moveTrayDrag}
                  onPointerUp={endTrayDrag}
                  onPointerCancel={() => setTrayDrag(null)}
                  onClick={() => {
                    if (draggedFromTray.current) {
                      draggedFromTray.current = false;
                      return;
                    }
                    place(candySticker(knockEventIds[0]), CENTRE);
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
          src={trayDrag.src}
          alt=""
          style={{ left: trayDrag.at.x, top: trayDrag.at.y }}
        />
      )}
    </div>
  );
};
