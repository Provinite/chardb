import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Modal } from "@mantine/core";
import {
  BOARD_BACKGROUNDS,
  NIGHT_SKY,
  backgroundName,
  backgroundStyle,
  findBackground,
} from "./boardBackgrounds";

/**
 * The owner's choice of what goes behind their candies. A choice is shown on
 * a preview the shape of the board, without the candies, and only reaches
 * the board -- and is saved -- when used.
 */

const Preview = styled.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${NIGHT_SKY};
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
  onClose: () => void;
  /** The background to use; null for the night sky. */
  onUse: (slug: string | null) => void;
}

export const BackgroundDialog: React.FC<BackgroundDialogProps> = ({
  open,
  value,
  onClose,
  onUse,
}) => {
  const [chosen, setChosen] = useState(value);
  // Each opening starts from what the board has, not a choice left behind.
  useEffect(() => {
    if (open) setChosen(value);
  }, [open, value]);

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
      />
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
            onUse(chosen);
            onClose();
          }}
        >
          Use background
        </DialogButton>
      </Buttons>
    </Modal>
  );
};
