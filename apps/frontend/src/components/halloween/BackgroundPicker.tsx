import React from "react";
import styled, { css } from "styled-components";
import {
  BOARD_BACKGROUNDS,
  NIGHT_SKY,
  backgroundName,
  backgroundStyle,
} from "./boardBackgrounds";

/**
 * The owner's choice of what goes behind their candies: the night sky, or a
 * picture or tile. Each choice is shown as a little board, drawn the way the
 * real one would be.
 */

const Title = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: ${({ theme }) => theme.spacing.xl} 0
    ${({ theme }) => theme.spacing.sm};
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Option = styled.button<{ $chosen: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs};
  border: 2px solid
    ${({ theme, $chosen }) =>
      $chosen ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  font: inherit;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  text-align: center;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  ${({ $chosen, theme }) =>
    $chosen &&
    css`
      color: ${theme.colors.text.primary};
    `}
`;

/** A little board: the same 4:3, drawn the same way. */
const Swatch = styled.span`
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${NIGHT_SKY};
`;

interface BackgroundPickerProps {
  /** The chosen background's slug; null for the night sky. */
  value: string | null;
  onChange: (slug: string | null) => void;
}

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  value,
  onChange,
}) => {
  const choices = [
    { slug: null, name: "night sky", style: {} },
    ...BOARD_BACKGROUNDS.map((background) => ({
      slug: background.slug,
      name: backgroundName(background.slug),
      style: backgroundStyle(background),
    })),
  ];
  return (
    <section>
      <Title id="candy-board-background">Background</Title>
      <Options role="radiogroup" aria-labelledby="candy-board-background">
        {choices.map(({ slug, name, style }) => (
          <Option
            key={slug ?? "night-sky"}
            type="button"
            role="radio"
            aria-checked={value === slug}
            aria-label={name}
            $chosen={value === slug}
            onClick={() => onChange(slug)}
          >
            <Swatch style={style} aria-hidden />
            {name}
          </Option>
        ))}
      </Options>
    </section>
  );
};
