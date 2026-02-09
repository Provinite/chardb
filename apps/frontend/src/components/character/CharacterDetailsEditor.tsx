import React from 'react';
import { MarkdownEditor } from '../MarkdownEditor';

interface CharacterDetailsEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * A markdown editor specifically for character details.
 * Wraps MarkdownEditor with character-specific defaults.
 */
export const CharacterDetailsEditor: React.FC<CharacterDetailsEditorProps> = ({
  value,
  onChange,
  error,
  maxLength = 15000,
  disabled = false,
}) => {
  return (
    <MarkdownEditor
      value={value}
      onChange={onChange}
      error={error}
      maxLength={maxLength}
      disabled={disabled}
      minHeight="300px"
      placeholder={`Describe your character using markdown formatting...

You can use markdown to organize your content:

# Description
Your character's appearance and general traits...

# Personality
Your character's personality, quirks, and behavior...

# Backstory
Your character's history, background, and story...

**Formatting tips:**
- **bold text** or __bold text__
- *italic text* or _italic text_
- ~~strikethrough~~
- \`inline code\`
- > quotes`}
    />
  );
};
