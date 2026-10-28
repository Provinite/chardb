import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Modal } from "@mantine/core";
import { Dices } from "lucide-react";
import {
  BOARD_NAME_WORDS,
  formatBoardName,
  shuffledName,
  type BoardName,
} from "./boardName";

/**
 * The owner names their board: a word from each list -- the joiner may be
 * none -- with the name as it reads shown large above, and a shuffle for
 * when nothing comes to mind. Saved only when used.
 */

const Hero = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  text-align: center;
`;

const Preview = styled.p<{ $partial: boolean }>`
  margin: 0;
  min-height: 1.3em;
  font-size: clamp(1.6rem, 4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.3;
  color: ${({ theme, $partial }) =>
    $partial ? theme.colors.text.muted : theme.colors.text.primary};
`;

const ShuffleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr minmax(130px, 0.6fr) 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ColumnTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Words = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
  padding: 2px;
`;

const Word = styled.button<{ $chosen: boolean; $none?: boolean }>`
  padding: 6px 12px;
  border: 1px solid
    ${({ theme, $chosen }) =>
      $chosen ? theme.colors.primary : theme.colors.border};
  border-radius: 999px;
  background: ${({ theme, $chosen }) =>
    $chosen ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $chosen }) =>
    $chosen ? "#ffffff" : theme.colors.text.primary};
  font: inherit;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-style: ${({ $none }) => ($none ? "italic" : "normal")};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Spacer = styled.span`
  flex: 1;
`;

const DialogButton = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid
    ${({ theme, $primary }) =>
      $primary ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, $primary }) =>
    $primary ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $primary, $danger }) =>
    $primary ? "#ffffff" : $danger ? "#dc2626" : theme.colors.text.primary};
  font: inherit;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface NameDialogProps {
  open: boolean;
  /** The board's name now; null for none. */
  value: BoardName | null;
  onClose: () => void;
  /** The name to give the board; null to take its name away. */
  onUse: (name: BoardName | null) => void;
}

export const NameDialog: React.FC<NameDialogProps> = ({ open, ...body }) => (
  <Modal
    opened={open}
    onClose={body.onClose}
    title="Name your board"
    size="xl"
    centered
  >
    {/* Mounted afresh each opening, so it starts from the board's name. */}
    <DialogBody {...body} />
  </Modal>
);

const DialogBody: React.FC<Omit<NameDialogProps, "open">> = ({
  value,
  onClose,
  onUse,
}) => {
  const [first, setFirst] = useState(value?.first ?? null);
  const [joiner, setJoiner] = useState(value?.joiner ?? null);
  const [last, setLast] = useState(value?.last ?? null);
  const name = first && last ? { first, joiner, last } : null;

  const shuffle = () => {
    const next = shuffledName(BOARD_NAME_WORDS, Math.random, name);
    setFirst(next.first);
    setJoiner(next.joiner);
    setLast(next.last);
  };

  const use = (chosen: BoardName | null) => {
    onUse(chosen);
    onClose();
  };

  return (
    <>
      <Hero>
        <Preview data-testid="name-preview" $partial={!name} aria-live="polite">
          {name
            ? formatBoardName(name)
            : [first, joiner, last].some(Boolean)
              ? [first ?? "…", joiner, last ?? "…"].filter(Boolean).join(" ")
              : null}
        </Preview>
        <ShuffleButton type="button" onClick={shuffle}>
          <Dices size={18} aria-hidden />
          Shuffle
        </ShuffleButton>
      </Hero>
      <Columns>
        <WordColumn
          title="First word"
          words={BOARD_NAME_WORDS.first}
          chosen={first}
          onChoose={setFirst}
        />
        <WordColumn
          title="Joiner"
          words={BOARD_NAME_WORDS.joiners}
          chosen={joiner}
          onChoose={setJoiner}
          noneLabel="No joiner"
        />
        <WordColumn
          title="Last word"
          words={BOARD_NAME_WORDS.last}
          chosen={last}
          onChoose={setLast}
        />
      </Columns>
      <Footer>
        {value && (
          <DialogButton type="button" $danger onClick={() => use(null)}>
            Remove name
          </DialogButton>
        )}
        <Spacer />
        <DialogButton type="button" onClick={onClose}>
          Cancel
        </DialogButton>
        <DialogButton
          type="button"
          $primary
          disabled={!name}
          onClick={() => name && use(name)}
        >
          Use name
        </DialogButton>
      </Footer>
    </>
  );
};

const WordColumn: React.FC<{
  title: string;
  words: readonly string[];
  chosen: string | null;
  onChoose: (word: string | null) => void;
  /** Offers a choice of none, called this. */
  noneLabel?: string;
}> = ({ title, words, chosen, onChoose, noneLabel }) => {
  const list = useRef<HTMLDivElement>(null);
  // The chosen word in view, wherever it is in the list: on opening on a
  // saved name, and after a shuffle.
  useEffect(() => {
    list.current
      ?.querySelector('[aria-checked="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [chosen]);

  return (
    <section>
      <ColumnTitle>{title}</ColumnTitle>
      <Words ref={list} role="radiogroup" aria-label={title}>
        {noneLabel && (
          <Word
            type="button"
            role="radio"
            aria-checked={chosen === null}
            $chosen={chosen === null}
            $none
            onClick={() => onChoose(null)}
          >
            {noneLabel}
          </Word>
        )}
        {words.map((word) => (
          <Word
            key={word}
            type="button"
            role="radio"
            aria-checked={chosen === word}
            $chosen={chosen === word}
            onClick={() => onChoose(word)}
          >
            {word}
          </Word>
        ))}
      </Words>
    </section>
  );
};
