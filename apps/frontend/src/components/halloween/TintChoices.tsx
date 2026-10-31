import React from "react";
import styled from "styled-components";
import { Tooltip } from "@chardb/ui";
import { TINT_PALETTE } from "./backgroundEffects";

/**
 * A row of colour swatches to pick one from: none, the Halloween palette,
 * or any colour from the browser's own picker. Used for a background's tint
 * and the light's colour.
 */

const Tints = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TINT_SIZE = 28;

const TintSwatch = styled.button<{ $chosen: boolean }>`
  width: ${TINT_SIZE}px;
  height: ${TINT_SIZE}px;
  padding: 0;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  outline: 2px solid
    ${({ theme, $chosen }) => ($chosen ? theme.colors.primary : "transparent")};
  outline-offset: 2px;
  cursor: pointer;
`;

/** No colour: an empty swatch, struck through. */
const NoTint = styled(TintSwatch)`
  background: linear-gradient(
    135deg,
    transparent calc(50% - 1px),
    #dc2626 calc(50% - 1px) calc(50% + 1px),
    transparent calc(50% + 1px)
  );
`;

/** The custom colour: the browser's own picker, as a rainbow swatch. */
const CustomTint = styled.label<{ $chosen: boolean; $colour: string | null }>`
  position: relative;
  width: ${TINT_SIZE}px;
  height: ${TINT_SIZE}px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  outline: 2px solid
    ${({ theme, $chosen }) => ($chosen ? theme.colors.primary : "transparent")};
  outline-offset: 2px;
  background: ${({ $colour }) =>
    $colour ??
    "conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)"};
  cursor: pointer;

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
`;

const PALETTE_COLOURS: readonly string[] = TINT_PALETTE.map((t) => t.colour);

interface TintChoicesProps {
  /** The chosen `#rrggbb`; null for none. */
  tint: string | null;
  onTint: (tint: string | null) => void;
  /** What the row is called, as its radio group's name. */
  label: string;
  /** What the no-colour swatch is called. */
  noneLabel: string;
  /** What the custom colour picker is called. */
  customLabel: string;
}

/** Memoised, so a slider beside it can move without redrawing it. */
export const TintChoices = React.memo<TintChoicesProps>(
  ({ tint, onTint, label, noneLabel, customLabel }) => {
    const custom = tint && !PALETTE_COLOURS.includes(tint) ? tint : null;
    return (
      <Tints role="radiogroup" aria-label={label}>
        <Tooltip label={noneLabel}>
          <NoTint
            type="button"
            role="radio"
            aria-label={noneLabel}
            aria-checked={tint === null}
            $chosen={tint === null}
            onClick={() => onTint(null)}
          />
        </Tooltip>
        {TINT_PALETTE.map(({ colour, name }) => (
          <Tooltip key={colour} label={name}>
            <TintSwatch
              type="button"
              role="radio"
              aria-label={name}
              aria-checked={tint === colour}
              $chosen={tint === colour}
              style={{ background: colour }}
              onClick={() => onTint(colour)}
            />
          </Tooltip>
        ))}
        <Tooltip label={customLabel}>
          <CustomTint $chosen={custom !== null} $colour={custom}>
            <input
              type="color"
              aria-label={customLabel}
              value={custom ?? "#888888"}
              onChange={(e) => onTint(e.target.value)}
            />
          </CustomTint>
        </Tooltip>
      </Tints>
    );
  },
);
TintChoices.displayName = "TintChoices";
