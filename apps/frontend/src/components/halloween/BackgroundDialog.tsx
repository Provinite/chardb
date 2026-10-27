import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Modal } from "@mantine/core";
import { Blend, Moon, Palette } from "lucide-react";
import { Tooltip } from "../Tooltip";
import {
  BOARD_BACKGROUNDS,
  NIGHT_SKY,
  backgroundName,
  backgroundStyle,
  findBackground,
} from "./boardBackgrounds";
import {
  BACKGROUND_DIM_MAX,
  DEFAULT_TINT_STRENGTH,
  NO_EFFECTS,
  TINT_PALETTE,
  savedEffects,
  type BackgroundEffects,
} from "./backgroundEffects";
import { BackgroundEffectLayers } from "./BackgroundEffectLayers";

const ICON_SIZE = 18;

/**
 * The owner's choice of what goes behind their candies. A choice is shown on
 * a preview the shape of the board, without the candies, and only reaches
 * the board -- and is saved -- when used.
 */

const Preview = styled.div`
  position: relative;
  /* So the tint blends with the background alone. */
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${NIGHT_SKY};
`;

const Effects = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.secondary};

  input[type="range"] {
    width: 100%;
    margin: 0;
  }
`;

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

/** No tint: an empty swatch, struck through. */
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

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Option = styled.button<{ $chosen: boolean }>`
  padding: 2px;
  border: 2px solid
    ${({ theme, $chosen }) =>
      $chosen ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: none;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

/** A little board: the same 4:3, drawn the same way. */
const Swatch = styled.span`
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${NIGHT_SKY};
`;

const Buttons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const DialogButton = styled.button<{ $primary?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, $primary }) =>
    $primary ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $primary }) =>
    $primary ? "#ffffff" : theme.colors.text.primary};
  font: inherit;
  cursor: pointer;
`;

const CHOICES = [
  { slug: null, name: "night sky" },
  ...BOARD_BACKGROUNDS.map(({ slug }) => ({
    slug,
    name: backgroundName(slug),
  })),
];

const PALETTE_COLOURS: readonly string[] = TINT_PALETTE.map((t) => t.colour);

interface BackgroundDialogProps {
  open: boolean;
  /** The board's background now; null for the night sky. */
  value: string | null;
  /** How the board's background is dimmed and tinted now; null for neither. */
  effects: BackgroundEffects | null;
  onClose: () => void;
  /**
   * The background to use, null for the night sky, and how it is dimmed and
   * tinted, null for neither.
   */
  onUse: (slug: string | null, effects: BackgroundEffects | null) => void;
}

export const BackgroundDialog: React.FC<BackgroundDialogProps> = ({
  open,
  value,
  effects,
  onClose,
  onUse,
}) => {
  const [chosen, setChosen] = useState(value);
  const [muting, setMuting] = useState(effects ?? NO_EFFECTS);
  // Each opening starts from what the board has, not a choice left behind.
  useEffect(() => {
    if (open) {
      setChosen(value);
      setMuting(effects ?? NO_EFFECTS);
    }
  }, [open, value, effects]);

  const tintWith = (tint: string | null) =>
    setMuting((m) => ({
      ...m,
      tint,
      // A first tint starts part way, rather than at none.
      tintStrength:
        tint && m.tintStrength === 0 ? DEFAULT_TINT_STRENGTH : m.tintStrength,
    }));
  const custom =
    muting.tint && !PALETTE_COLOURS.includes(muting.tint) ? muting.tint : null;

  return (
    <Modal
      opened={open}
      onClose={onClose}
      title="Background"
      size="lg"
      centered
    >
      <Preview
        role="img"
        aria-label="Background preview"
        style={backgroundStyle(findBackground(chosen))}
      >
        <BackgroundEffectLayers effects={muting} />
      </Preview>
      <Effects>
        <Tooltip label="Dim">
          <Moon size={ICON_SIZE} aria-hidden />
        </Tooltip>
        <input
          type="range"
          aria-label="Dim"
          min={0}
          max={BACKGROUND_DIM_MAX}
          step={0.05}
          value={muting.dim}
          onChange={(e) =>
            setMuting((m) => ({ ...m, dim: Number(e.target.value) }))
          }
        />
        <Tooltip label="Tint">
          <Palette size={ICON_SIZE} aria-hidden />
        </Tooltip>
        <Tints role="radiogroup" aria-label="Tint">
          <Tooltip label="No tint">
            <NoTint
              type="button"
              role="radio"
              aria-label="No tint"
              aria-checked={muting.tint === null}
              $chosen={muting.tint === null}
              onClick={() => tintWith(null)}
            />
          </Tooltip>
          {TINT_PALETTE.map(({ colour, name }) => (
            <Tooltip key={colour} label={name}>
              <TintSwatch
                type="button"
                role="radio"
                aria-label={name}
                aria-checked={muting.tint === colour}
                $chosen={muting.tint === colour}
                style={{ background: colour }}
                onClick={() => tintWith(colour)}
              />
            </Tooltip>
          ))}
          <Tooltip label="Custom tint">
            <CustomTint $chosen={custom !== null} $colour={custom}>
              <input
                type="color"
                aria-label="Custom tint"
                value={custom ?? "#888888"}
                onChange={(e) => tintWith(e.target.value)}
              />
            </CustomTint>
          </Tooltip>
        </Tints>
        <Tooltip label="Tint strength">
          <Blend size={ICON_SIZE} aria-hidden />
        </Tooltip>
        <input
          type="range"
          aria-label="Tint strength"
          min={0}
          max={1}
          step={0.05}
          disabled={muting.tint === null}
          value={muting.tintStrength}
          onChange={(e) =>
            setMuting((m) => ({ ...m, tintStrength: Number(e.target.value) }))
          }
        />
      </Effects>
      <Options role="radiogroup" aria-label="Backgrounds">
        {CHOICES.map(({ slug, name }) => (
          <Option
            key={slug ?? "night-sky"}
            type="button"
            role="radio"
            aria-checked={chosen === slug}
            aria-label={name}
            title={name}
            $chosen={chosen === slug}
            onClick={() => setChosen(slug)}
          >
            <Swatch style={backgroundStyle(findBackground(slug))} aria-hidden />
          </Option>
        ))}
      </Options>
      <Buttons>
        <DialogButton type="button" onClick={onClose}>
          Cancel
        </DialogButton>
        <DialogButton
          type="button"
          $primary
          onClick={() => {
            onUse(chosen, savedEffects(muting));
            onClose();
          }}
        >
          Use background
        </DialogButton>
      </Buttons>
    </Modal>
  );
};
