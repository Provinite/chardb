import React, { useCallback, useRef } from "react";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { Cluster, Popover, Stack, Toggletip, Tooltip } from "@chardb/ui";
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
import * as styles from "./LightingControl.css";

/**
 * Where the light over the board is: a dot on a circle standing for the
 * board, seen from above, and a slider for how high it hangs. Every change is
 * handed up at once, so the board's shadows follow the dot as it moves.
 */

const ICON_SIZE = 20;
/** How far an arrow key moves the light, as a share of the circle's radius. */
const STEP = 0.1;
const BIG_STEP = 0.25;

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

  const slider = (
    label: string,
    tooltip: string,
    icon: React.ReactNode,
    input: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <Tooltip label={tooltip}>
      <label className={styles.slider}>
        {icon}
        <input
          type="range"
          aria-label={label}
          className={styles.sliderInput}
          {...input}
        />
      </label>
    </Tooltip>
  );

  return (
    <Popover.Root side="bottom" align="center">
      <Popover.Trigger>
        <button type="button" className={styles.trigger}>
          <Sun size={16} aria-hidden />
          Lighting
        </button>
      </Popover.Trigger>
      <Popover.Panel aria-label="Lighting">
        <Stack gap="md" className={styles.panel}>
          <Cluster gap="md" align="flex-end">
            <div className={styles.padArea}>
              {/* How to use the pad, on its corner, for anyone: a title would
                  reach only those hovering with a mouse, and the arrow keys
                  are found nowhere else. */}
              <Toggletip label="How to move the light" className={styles.info}>
                Drag the light, or use the arrow keys
              </Toggletip>
              <div
                ref={pad}
                role="group"
                aria-label="Light position"
                tabIndex={0}
                className={styles.padSurface}
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
                  <span className={styles.poolClip}>
                    <span
                      data-testid="spotlight-pool"
                      className={styles.pool}
                      style={assignInlineVars({
                        [styles.poolLeft]: `${round(pool.x)}%`,
                        [styles.poolTop]: `${round(pool.y)}%`,
                        [styles.poolWidth]: `${pool.radius * pool.stretch * 2}%`,
                        [styles.poolHeight]: `${pool.radius * 2}%`,
                        [styles.poolTransform]: `translate(-50%, -50%) rotate(${pool.angle}deg)`,
                      })}
                    />
                  </span>
                )}
                <span
                  className={styles.dot}
                  style={assignInlineVars({
                    [styles.dotLeft]: `${50 + light.x * 50}%`,
                    [styles.dotTop]: `${50 + light.y * 50}%`,
                  })}
                />
              </div>
              <Tooltip label="Default light">
                <button
                  type="button"
                  aria-label="Default light"
                  className={styles.reset}
                  onClick={() => onChange(null)}
                >
                  <RotateCcw size={ICON_SIZE} aria-hidden />
                </button>
              </Tooltip>
            </div>
            <Tooltip label="Height">
              <label className={styles.heightSlider}>
                <ArrowUpFromLine size={ICON_SIZE} aria-hidden />
                <span className={styles.uprightTrack}>
                  <input
                    type="range"
                    aria-label="Light height"
                    aria-orientation="vertical"
                    className={styles.uprightInput}
                    min={LIGHT_HEIGHT_MIN}
                    max={LIGHT_HEIGHT_MAX}
                    step={0.05}
                    value={light.height}
                    onChange={(e) => move({ height: Number(e.target.value) })}
                  />
                </span>
              </label>
            </Tooltip>
          </Cluster>
          {slider(
            "Light intensity",
            "Intensity",
            <Contrast size={ICON_SIZE} aria-hidden />,
            {
              min: 0,
              max: 1,
              step: 0.05,
              value: light.intensity,
              onChange: (e) => move({ intensity: Number(e.target.value) }),
            },
          )}
          <div className={styles.colourRow}>
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
          </div>
          {slider(
            "Light colour strength",
            "Colour strength",
            <Blend size={ICON_SIZE} aria-hidden />,
            {
              min: 0,
              max: 1,
              step: 0.01,
              disabled: !light.colour,
              value: light.colourStrength,
              onChange: (e) => move({ colourStrength: Number(e.target.value) }),
            },
          )}
          {slider(
            "Spotlight",
            "Spotlight",
            <Flashlight size={ICON_SIZE} aria-hidden />,
            {
              min: 0,
              max: 1,
              step: 0.01,
              value: light.spotlight,
              onChange: (e) => move({ spotlight: Number(e.target.value) }),
            },
          )}
          {slider(
            "Spotlight cone",
            "Cone",
            <Cone size={ICON_SIZE} aria-hidden />,
            {
              min: 0,
              max: 1,
              step: 0.01,
              disabled: light.spotlight === 0,
              value: light.cone,
              onChange: (e) => move({ cone: Number(e.target.value) }),
            },
          )}
        </Stack>
      </Popover.Panel>
    </Popover.Root>
  );
};
