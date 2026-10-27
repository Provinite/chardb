import React, { useRef, useState } from "react";
import styled, { css } from "styled-components";
import {
  BOARD_ASPECT,
  CANDY_SIZE,
  SCALE_MAX,
  SCALE_MIN,
  bringToFront,
  candyImageUrl,
  candyName,
  moveTo,
  placeFromTray,
  pointOnBoard,
  removeFromBoard,
  trayGroups,
  updatePlacement,
  type Placement,
  type Point,
} from "./candyBoard";

/**
 * A candy board, and when `onChange` is given, the tools to arrange it: tap a
 * candy in the tray to stick it in the middle or drag it onto the board, drag
 * candies around, and turn, resize, raise or remove the selected one.
 *
 * The board is night-time art rather than page chrome, so it keeps its own
 * colours in both themes.
 */

export interface BoardCandy {
  knockEventId: number;
  slug: string;
}

const CENTRE: Point = { x: 0.5, y: 0.5 };
/** How far a pointer moves before a tap on the tray becomes a drag. */
const DRAG_THRESHOLD_PX = 5;
const NUDGE = 0.01;
const BIG_NUDGE = 0.05;

const Board = styled.div<{ $editable: boolean }>`
  position: relative;
  width: 100%;
  aspect-ratio: ${BOARD_ASPECT};
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background:
    radial-gradient(ellipse at 50% 120%, #f9731655 0%, #f9731600 55%),
    radial-gradient(circle at 82% 16%, #fde68a 0 3.5%, #fde68a00 4%),
    linear-gradient(180deg, #1e1b4b 0%, #3b0764 70%, #431407 100%);
  box-shadow: ${({ theme }) => theme.shadows.lg};
  touch-action: ${({ $editable }) => ($editable ? "none" : "auto")};
  user-select: none;
`;

const Candy = styled.img<{ $selected: boolean; $editable: boolean }>`
  position: absolute;
  height: auto;
  transform-origin: center;
  filter: drop-shadow(0 4px 6px #00000066);
  -webkit-user-drag: none;
  ${({ $editable }) =>
    $editable &&
    css`
      cursor: grab;
      &:active {
        cursor: grabbing;
      }
    `}
  ${({ $selected }) =>
    $selected &&
    css`
      outline: 2px dashed #fde68a;
      outline-offset: 4px;
    `}
  &:focus-visible {
    outline: 2px solid #fde68a;
    outline-offset: 4px;
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
`;

const ToolButton = styled.button`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

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
  touch-action: none;

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
  onChange?: (placements: Placement[]) => void;
  /** Called while a candy is being dragged, so saving can wait for the drop. */
  onDraggingChange?: (dragging: boolean) => void;
}

export const CandyBoard: React.FC<CandyBoardProps> = ({
  candies,
  placements,
  onChange,
  onDraggingChange,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  /** A candy on the board being dragged: where on it the pointer grabbed. */
  const drag = useRef<{ id: number; offset: Point } | null>(null);
  /** A candy being dragged out of the tray. */
  const [trayDrag, setTrayDrag] = useState<{
    id: number;
    slug: string;
    start: Point;
    at: Point;
    moved: boolean;
  } | null>(null);
  const draggedFromTray = useRef(false);

  const editable = Boolean(onChange);
  const slugs = new Map(candies.map((c) => [c.knockEventId, c.slug]));
  const selectedPlacement = placements.find((p) => p.knockEventId === selected);

  const boardPoint = (clientX: number, clientY: number): Point | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return pointOnBoard(clientX, clientY, rect);
  };

  const setDragging = (dragging: boolean) => onDraggingChange?.(dragging);

  const startMove = (e: React.PointerEvent<HTMLImageElement>, p: Placement) => {
    if (!onChange) return;
    // Stops the browser's own image drag, and with it the focus a press
    // would give; focusing by hand keeps the keyboard shortcuts on this one.
    e.preventDefault();
    e.currentTarget.focus();
    setSelected(p.knockEventId);
    const point = boardPoint(e.clientX, e.clientY);
    drag.current = {
      id: p.knockEventId,
      offset: point ? { x: point.x - p.x, y: point.y - p.y } : { x: 0, y: 0 },
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!onChange || !drag.current) return;
    const point = boardPoint(e.clientX, e.clientY);
    if (!point) return;
    const { id, offset } = drag.current;
    onChange(
      moveTo(placements, id, { x: point.x - offset.x, y: point.y - offset.y }),
    );
  };

  const endMove = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
  };

  const place = (id: number, point: Point) => {
    if (!onChange) return;
    onChange(placeFromTray(placements, id, point));
    setSelected(id);
  };

  const startTrayDrag = (e: React.PointerEvent, id: number, slug: string) => {
    const at = { x: e.clientX, y: e.clientY };
    setTrayDrag({ id, slug, start: at, at, moved: false });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const moveTrayDrag = (e: React.PointerEvent) => {
    if (!trayDrag) return;
    const at = { x: e.clientX, y: e.clientY };
    const moved =
      trayDrag.moved ||
      Math.hypot(at.x - trayDrag.start.x, at.y - trayDrag.start.y) >
        DRAG_THRESHOLD_PX;
    setTrayDrag({ ...trayDrag, at, moved });
  };

  const endTrayDrag = (e: React.PointerEvent) => {
    if (!trayDrag) return;
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
    if (!onChange) return;
    const step = e.shiftKey ? BIG_NUDGE : NUDGE;
    const keys: Record<string, () => Placement[]> = {
      ArrowLeft: () =>
        moveTo(placements, p.knockEventId, { ...p, x: p.x - step }),
      ArrowRight: () =>
        moveTo(placements, p.knockEventId, { ...p, x: p.x + step }),
      ArrowUp: () =>
        moveTo(placements, p.knockEventId, { ...p, y: p.y - step }),
      ArrowDown: () =>
        moveTo(placements, p.knockEventId, { ...p, y: p.y + step }),
      "[": () =>
        updatePlacement(placements, p.knockEventId, {
          rotation: p.rotation - 15,
        }),
      "]": () =>
        updatePlacement(placements, p.knockEventId, {
          rotation: p.rotation + 15,
        }),
      "-": () =>
        updatePlacement(placements, p.knockEventId, { scale: p.scale - 0.1 }),
      "=": () =>
        updatePlacement(placements, p.knockEventId, { scale: p.scale + 0.1 }),
      Delete: () => removeFromBoard(placements, p.knockEventId),
      Backspace: () => removeFromBoard(placements, p.knockEventId),
    };
    const edit = keys[e.key];
    if (!edit) return;
    e.preventDefault();
    onChange(edit());
  };

  const groups = trayGroups(candies, placements);

  return (
    <>
      <Board
        ref={boardRef}
        role="region"
        aria-label="Candy board"
        $editable={editable}
        onPointerMove={move}
        onPointerUp={endMove}
        onPointerCancel={endMove}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        {placements.map((p) => {
          const slug = slugs.get(p.knockEventId);
          if (!slug) return null;
          return (
            <Candy
              key={p.knockEventId}
              src={candyImageUrl(slug)}
              alt={candyName(slug)}
              draggable={false}
              $editable={editable}
              $selected={editable && selected === p.knockEventId}
              tabIndex={editable ? 0 : undefined}
              onPointerDown={(e) => startMove(e, p)}
              onFocus={() => editable && setSelected(p.knockEventId)}
              onKeyDown={(e) => onCandyKey(e, p)}
              style={{
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                width: `${CANDY_SIZE * p.scale * 100}%`,
                transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
              }}
            />
          );
        })}
      </Board>

      {onChange && selectedPlacement && (
        <Toolbar aria-label="Selected candy">
          <label>
            Turn
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selectedPlacement.rotation}
              onChange={(e) =>
                onChange(
                  updatePlacement(placements, selectedPlacement.knockEventId, {
                    rotation: Number(e.target.value),
                  }),
                )
              }
            />
          </label>
          <label>
            Size
            <input
              type="range"
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={0.05}
              value={selectedPlacement.scale}
              onChange={(e) =>
                onChange(
                  updatePlacement(placements, selectedPlacement.knockEventId, {
                    scale: Number(e.target.value),
                  }),
                )
              }
            />
          </label>
          <ToolButton
            type="button"
            onClick={() =>
              onChange(bringToFront(placements, selectedPlacement.knockEventId))
            }
          >
            Bring to front
          </ToolButton>
          <ToolButton
            type="button"
            onClick={() => {
              onChange(
                removeFromBoard(placements, selectedPlacement.knockEventId),
              );
              setSelected(null);
            }}
          >
            Back to tray
          </ToolButton>
        </Toolbar>
      )}

      {onChange && (
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
