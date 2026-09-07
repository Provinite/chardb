import React from "react";
import styled from "styled-components";

/**
 * Picks which of a character's forms is on screen.
 *
 * Renders nothing for a character with one form, which is almost all of them:
 * a switcher with a single option is a control that cannot do anything, and
 * putting one above every character's traits would make the ordinary case look
 * like the exception.
 *
 * Holds no state and fetches nothing -- the character page owns the selection,
 * because more than one section reads it.
 */
const Tabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.375rem 0.75rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.primary}18` : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-size: 0.8125rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export interface CharacterFormSwitcherProps {
  forms: ReadonlyArray<{ id: string; name: string }>;
  activeFormId: string | null;
  onSelect: (formId: string) => void;
}

export const CharacterFormSwitcher: React.FC<CharacterFormSwitcherProps> = ({
  forms,
  activeFormId,
  onSelect,
}) => {
  if (forms.length < 2) return null;

  return (
    <Tabs role="tablist" aria-label="Forms" data-testid="character-forms">
      {forms.map((form) => (
        <Tab
          key={form.id}
          type="button"
          role="tab"
          aria-selected={form.id === activeFormId}
          $active={form.id === activeFormId}
          data-testid={`character-form-tab-${form.id}`}
          onClick={() => onSelect(form.id)}
        >
          {form.name}
        </Tab>
      ))}
    </Tabs>
  );
};
