import React, { useCallback, useState } from "react";
import styled from "styled-components";
import { Modal } from "@mantine/core";
import { Blend, Droplets, Moon, Palette } from "lucide-react";
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
  savedEffects,
  type BackgroundEffects,
} from "./backgroundEffects";
import { BackgroundEffectLayers } from "./BackgroundEffectLayers";
import { TintChoices } from "./TintChoices";

const ICON_SIZE = 18;
/** How far the saturation, dim and tint strength sliders move a notch. */
const SLIDER_STEP = 0.01;

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
}) => (
  <Modal opened={open} onClose={onClose} title="Background" size="lg" centered>
    {/* Mounted afresh each opening, so it starts from what the board has. */}
    <DialogBody
      value={value}
      effects={effects}
      onClose={onClose}
      onUse={onUse}
    />
  </Modal>
);

// The icons naming each row, the same every render.
const SATURATION_ICON = (
  <Tooltip label="Saturation">
    <Droplets size={ICON_SIZE} aria-hidden />
  </Tooltip>
);
const DIM_ICON = (
  <Tooltip label="Dim">
    <Moon size={ICON_SIZE} aria-hidden />
  </Tooltip>
);
const TINT_ICON = (
  <Tooltip label="Tint">
    <Palette size={ICON_SIZE} aria-hidden />
  </Tooltip>
);
const STRENGTH_ICON = (
  <Tooltip label="Tint strength">
    <Blend size={ICON_SIZE} aria-hidden />
  </Tooltip>
);

/**
 * The dialog's contents. Its state lives here, under the Modal, and the
 * swatches are memoised, so dragging a slider re-renders only the preview
 * and the slider: an input event can come several times a frame.
 */
const DialogBody: React.FC<Omit<BackgroundDialogProps, "open">> = ({
  value,
  effects,
  onClose,
  onUse,
}) => {
  const [chosen, setChosen] = useState(value);
  const [muting, setMuting] = useState(effects ?? NO_EFFECTS);

  const tintWith = useCallback(
    (tint: string | null) =>
      setMuting((m) => ({
        ...m,
        tint,
        // A first tint starts part way, rather than at none.
        tintStrength:
          tint && m.tintStrength === 0 ? DEFAULT_TINT_STRENGTH : m.tintStrength,
      })),
    [],
  );

  return (
    <>
      <Preview
        role="img"
        aria-label="Background preview"
        style={backgroundStyle(findBackground(chosen))}
      >
        <BackgroundEffectLayers effects={muting} />
      </Preview>
      <Effects>
        {SATURATION_ICON}
        <input
          type="range"
          aria-label="Saturation"
          min={0}
          max={1}
          step={SLIDER_STEP}
          value={muting.saturation}
          onChange={(e) =>
            setMuting((m) => ({ ...m, saturation: Number(e.target.value) }))
          }
        />
        {DIM_ICON}
        <input
          type="range"
          aria-label="Dim"
          min={0}
          max={BACKGROUND_DIM_MAX}
          step={SLIDER_STEP}
          value={muting.dim}
          onChange={(e) =>
            setMuting((m) => ({ ...m, dim: Number(e.target.value) }))
          }
        />
        {TINT_ICON}
        <TintChoices
          tint={muting.tint}
          onTint={tintWith}
          label="Tint"
          noneLabel="No tint"
          customLabel="Custom tint"
        />
        {STRENGTH_ICON}
        <input
          type="range"
          aria-label="Tint strength"
          min={0}
          max={1}
          step={SLIDER_STEP}
          disabled={muting.tint === null}
          value={muting.tintStrength}
          onChange={(e) =>
            setMuting((m) => ({ ...m, tintStrength: Number(e.target.value) }))
          }
        />
      </Effects>
      <BackgroundChoices chosen={chosen} onChoose={setChosen} />
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
    </>
  );
};

const BackgroundChoices = React.memo<{
  chosen: string | null;
  onChoose: (slug: string | null) => void;
}>(({ chosen, onChoose }) => (
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
        onClick={() => onChoose(slug)}
      >
        <Swatch style={backgroundStyle(findBackground(slug))} aria-hidden />
      </Option>
    ))}
  </Options>
));
BackgroundChoices.displayName = "BackgroundChoices";
