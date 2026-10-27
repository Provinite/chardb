import React, { useRef } from "react";
import styled from "styled-components";
import { Popover } from "@mantine/core";
import { Sun } from "lucide-react";
import {
  DEFAULT_LIGHTING,
  LIGHT_HEIGHT_MAX,
  LIGHT_HEIGHT_MIN,
  clampLighting,
  type Lighting,
} from "./candyLighting";

/**
 * Where the light over the board is: a dot on a circle standing for the
 * board, seen from above, and a slider for how high it hangs. Every change is
 * handed up at once, so the board's shadows follow the dot as it moves.
 */

const PAD_SIZE = 140;
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
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};
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

const HeightRow = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  input {
    width: 140px;
  }
`;

const Reset = styled.button`
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.primary};
  font: inherit;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
`;

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

  const move = (changes: Partial<Lighting>) => {
    const next = clampLighting({ ...light, ...changes });
    onChange({
      x: round(next.x),
      y: round(next.y),
      height: round(next.height),
    });
  };

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
    // Not hidden when the button is out of view: the pad is still the light's
    // whole state, and jsdom, with no layout, always reads the button as gone.
    <Popover position="bottom" withArrow hideDetached={false}>
      <Popover.Target>
        <Trigger type="button">
          <Sun size={16} aria-hidden />
          Lighting
        </Trigger>
      </Popover.Target>
      <Popover.Dropdown role="dialog" aria-label="Lighting">
        <Panel>
          <Pad
            ref={pad}
            role="group"
            aria-label="Light position"
            title="Drag the light, or use the arrow keys"
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
            <LightDot
              style={{
                left: `${50 + light.x * 50}%`,
                top: `${50 + light.y * 50}%`,
              }}
            />
          </Pad>
          <HeightRow>
            Height
            <input
              type="range"
              aria-label="Light height"
              min={LIGHT_HEIGHT_MIN}
              max={LIGHT_HEIGHT_MAX}
              step={0.05}
              value={light.height}
              onChange={(e) => move({ height: Number(e.target.value) })}
            />
          </HeightRow>
          <Reset type="button" onClick={() => onChange(null)}>
            Default light
          </Reset>
        </Panel>
      </Popover.Dropdown>
    </Popover>
  );
};
