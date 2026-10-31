import React, { useCallback, useRef } from "react";
import styled from "styled-components";
import { Cluster, Popover, Toggletip, Tooltip } from "@chardb/ui";
import {
  ArrowUpFromLine,
  Blend,
  Cone,
  Contrast,
  Flashlight,
  Palette,
  RotateCcw,
  Sun,
} from "lucide-react";
import { TintChoices } from "./TintChoices";
import {
  DEFAULT_LIGHTING,
  LIGHT_HEIGHT_MAX,
  LIGHT_HEIGHT_MIN,
  clampLighting,
  spotlightOf,
  type Lighting,
} from "./candyLighting";

/**
 * Where the light over the board is: a dot on a circle standing for the
 * board, seen from above, and a slider for how high it hangs. Every change is
 * handed up at once, so the board's shadows follow the dot as it moves.
 */

const PAD_SIZE = 190;
const ICON_SIZE = 20;
/** How far an arrow key moves the light, as a share of the circle's radius. */
const STEP = 0.1;
const BIG_STEP = 0.25;

const Trigger = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
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

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Controls = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
`;

/** The pad, with the reset button over its top-right corner. */
const PadArea = styled.div`
  position: relative;
`;

const Pad = styled.div`
  position: relative;
  width: ${PAD_SIZE}px;
  height: ${PAD_SIZE}px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  background: radial-gradient(
    circle,
    ${({ theme }) => theme.colors.surface} 0 60%,
    ${({ theme }) => theme.colors.border} 100%
  );
  cursor: crosshair;
  touch-action: none;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  /* The board's centre, where an overhead light sits. */
  &::after {
    content: "";
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 4px;
    margin: -2px 0 0 -2px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.text.muted};
  }
`;

const LightDot = styled.span`
  position: absolute;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  border: 2px solid #b45309;
  border-radius: 50%;
  background: #fde68a;
  box-shadow: 0 0 10px #fde68a;
  pointer-events: none;
`;

/** Keeps the spotlight's outline inside the pad's circle. */
const PoolClip = styled.span`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
`;

/**
 * Where a spotlight lands, across the pad from the light: the pad stands
 * for the board, so the pool is drawn at its size there.
 */
const PoolOutline = styled.span`
  position: absolute;
  border: 2px dashed #fde68acc;
  border-radius: 50%;
  background: #fde68a22;
`;

const Reset = styled.button`
  position: absolute;
  top: -4px;
  right: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

/** An icon over an upright slider as tall as the pad. */
const HeightSlider = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const UprightTrack = styled.div`
  position: relative;
  width: 24px;
  height: ${PAD_SIZE - ICON_SIZE}px;

  /* A range input turned upright, as wide as the track is tall; writing-mode
     would do it without the turn, but not before Chrome 124. */
  input {
    position: absolute;
    left: 50%;
    top: 50%;
    width: ${PAD_SIZE - ICON_SIZE}px;
    margin: 0;
    transform: translate(-50%, -50%) rotate(-90deg);
  }
`;

const IntensitySlider = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};

  input {
    flex: 1;
    margin: 0;
  }
`;

/** The swatches and their icon; as wide as the pad and height slider. */
const ColourRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  max-width: ${PAD_SIZE + 60}px;
`;

/** How strongly a light colours when a colour is first picked. */
const DEFAULT_COLOUR_STRENGTH = 0.3;

const round = (n: number) => Math.round(n * 100) / 100;

interface LightingControlProps {
  /** The board's light; null for the default one. */
  value: Lighting | null;
  onChange: (lighting: Lighting | null) => void;
}

export const LightingControl: React.FC<LightingControlProps> = ({
  value,
  onChange,
}) => {
  const pad = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const light = value ?? DEFAULT_LIGHTING;
  const pool = spotlightOf(light);

  const move = (changes: Partial<Lighting>) => {
    const next = clampLighting({ ...light, ...changes });
    onChange({
      ...next,
      x: round(next.x),
      y: round(next.y),
      height: round(next.height),
      intensity: round(next.intensity),
      colourStrength: round(next.colourStrength),
      spotlight: round(next.spotlight),
      cone: round(next.cone),
    });
  };
  // The latest move, so the memoised swatches get one unchanging callback
  // and are not redrawn while a slider moves.
  const latestMove = useRef(move);
  latestMove.current = move;
  const latestLight = useRef(light);
  latestLight.current = light;
  const colourWith = useCallback((colour: string | null) => {
    const firstColour = colour && latestLight.current.colourStrength === 0;
    latestMove.current(
      // A first colour starts part way, rather than at none.
      firstColour
        ? { colour, colourStrength: DEFAULT_COLOUR_STRENGTH }
        : { colour },
    );
  }, []);

  /** The light under a pointer on the pad, in the unit circle. */
  const placeAt = (clientX: number, clientY: number) => {
    const rect = pad.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const radius = rect.width / 2;
    move({
      x: (clientX - rect.left - radius) / radius,
      y: (clientY - rect.top - radius) / radius,
    });
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? BIG_STEP : STEP;
    const moves: Record<string, Partial<Lighting>> = {
      ArrowLeft: { x: light.x - step },
      ArrowRight: { x: light.x + step },
      ArrowUp: { y: light.y - step },
      ArrowDown: { y: light.y + step },
      Home: { x: 0, y: 0 },
    };
    const changes = moves[e.key];
    if (!changes) return;
    e.preventDefault();
    move(changes);
  };

  return (
    <Popover.Root side="bottom" align="center">
      <Popover.Trigger>
        <Trigger type="button">
          <Sun size={16} aria-hidden />
          Lighting
        </Trigger>
      </Popover.Trigger>
      <Popover.Panel aria-label="Lighting">
        <Panel>
          {/* How to use the pad, for anyone: a title would reach only those
              hovering with a mouse, and the arrow keys are found nowhere
              else. */}
          <Cluster>
            <Toggletip label="How to move the light">
              Drag the light, or use the arrow keys
            </Toggletip>
          </Cluster>
          <Controls>
            <PadArea>
              <Pad
                ref={pad}
                role="group"
                aria-label="Light position"
                tabIndex={0}
                onKeyDown={onKey}
                onPointerDown={(e) => {
                  dragging.current = e.pointerId;
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  placeAt(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (dragging.current === e.pointerId) {
                    placeAt(e.clientX, e.clientY);
                  }
                }}
                onPointerUp={() => {
                  dragging.current = null;
                }}
                onPointerCancel={() => {
                  dragging.current = null;
                }}
              >
                {pool && (
                  <PoolClip>
                    <PoolOutline
                      data-testid="spotlight-pool"
                      style={{
                        left: `${round(pool.x)}%`,
                        top: `${round(pool.y)}%`,
                        width: `${pool.radius * pool.stretch * 2}%`,
                        height: `${pool.radius * 2}%`,
                        transform: `translate(-50%, -50%) rotate(${pool.angle}deg)`,
                      }}
                    />
                  </PoolClip>
                )}
                <LightDot
                  style={{
                    left: `${50 + light.x * 50}%`,
                    top: `${50 + light.y * 50}%`,
                  }}
                />
              </Pad>
              <Tooltip label="Default light">
                <Reset
                  type="button"
                  aria-label="Default light"
                  onClick={() => onChange(null)}
                >
                  <RotateCcw size={ICON_SIZE} aria-hidden />
                </Reset>
              </Tooltip>
            </PadArea>
            <Tooltip label="Height">
              <HeightSlider>
                <ArrowUpFromLine size={ICON_SIZE} aria-hidden />
                <UprightTrack>
                  <input
                    type="range"
                    aria-label="Light height"
                    aria-orientation="vertical"
                    min={LIGHT_HEIGHT_MIN}
                    max={LIGHT_HEIGHT_MAX}
                    step={0.05}
                    value={light.height}
                    onChange={(e) => move({ height: Number(e.target.value) })}
                  />
                </UprightTrack>
              </HeightSlider>
            </Tooltip>
          </Controls>
          <Tooltip label="Intensity">
            <IntensitySlider>
              <Contrast size={ICON_SIZE} aria-hidden />
              <input
                type="range"
                aria-label="Light intensity"
                min={0}
                max={1}
                step={0.05}
                value={light.intensity}
                onChange={(e) => move({ intensity: Number(e.target.value) })}
              />
            </IntensitySlider>
          </Tooltip>
          <ColourRow>
            <Tooltip label="Light colour">
              <Palette size={ICON_SIZE} aria-hidden />
            </Tooltip>
            <TintChoices
              tint={light.colour ?? null}
              onTint={colourWith}
              label="Light colour"
              noneLabel="White light"
              customLabel="Custom light colour"
            />
          </ColourRow>
          <Tooltip label="Colour strength">
            <IntensitySlider>
              <Blend size={ICON_SIZE} aria-hidden />
              <input
                type="range"
                aria-label="Light colour strength"
                min={0}
                max={1}
                step={0.01}
                disabled={!light.colour}
                value={light.colourStrength}
                onChange={(e) =>
                  move({ colourStrength: Number(e.target.value) })
                }
              />
            </IntensitySlider>
          </Tooltip>
          <Tooltip label="Spotlight">
            <IntensitySlider>
              <Flashlight size={ICON_SIZE} aria-hidden />
              <input
                type="range"
                aria-label="Spotlight"
                min={0}
                max={1}
                step={0.01}
                value={light.spotlight}
                onChange={(e) => move({ spotlight: Number(e.target.value) })}
              />
            </IntensitySlider>
          </Tooltip>
          <Tooltip label="Cone">
            <IntensitySlider>
              <Cone size={ICON_SIZE} aria-hidden />
              <input
                type="range"
                aria-label="Spotlight cone"
                min={0}
                max={1}
                step={0.01}
                disabled={light.spotlight === 0}
                value={light.cone}
                onChange={(e) => move({ cone: Number(e.target.value) })}
              />
            </IntensitySlider>
          </Tooltip>
        </Panel>
      </Popover.Panel>
    </Popover.Root>
  );
};
