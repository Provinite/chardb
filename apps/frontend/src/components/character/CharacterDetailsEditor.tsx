import React, { useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;

  &[aria-invalid="true"] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const Toolbar = styled.div`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ToolbarButtons = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const ToolbarButton = styled.button`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surface};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 1px;
  }
`;

const ToolbarHint = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 300px;
  padding: ${({ theme }) => theme.spacing.md};
  border: none;
  font-family: 'Monaco, Consolas, "Courier New", monospace';
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.6;
  resize: vertical;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const PreviewContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  min-height: 300px;
  max-height: 600px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background};
`;

const PreviewContent = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};

  h1, h2, h3, h4, h5, h6 {
    margin: ${({ theme }) => theme.spacing.md} 0 ${({ theme }) => theme.spacing.sm};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }

  h1 { font-size: ${({ theme }) => theme.typography.fontSize.xl}; }
  h2 { font-size: ${({ theme }) => theme.typography.fontSize.lg}; }
  h3 { font-size: ${({ theme }) => theme.typography.fontSize.md}; }

  p {
    margin: ${({ theme }) => theme.spacing.sm} 0;
  }

  strong { font-weight: bold; }
  em { font-style: italic; }

  code {
    background: ${({ theme }) => theme.colors.surface};
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  blockquote {
    border-left: 4px solid ${({ theme }) => theme.colors.border};
    padding-left: ${({ theme }) => theme.spacing.md};
    margin: ${({ theme }) => theme.spacing.md} 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Footer = styled.div`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CharCount = styled.span<{ isNearLimit?: boolean }>`
  color: ${({ isNearLimit, theme }) =>
    isNearLimit ? theme.colors.error : theme.colors.text.muted};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.error}15;
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.error};
`;

interface CharacterDetailsEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
}

/**
 * Simple markdown renderer for preview functionality
 * Supports basic markdown features like headers, bold, italic, code, and quotes
 */
const renderMarkdownPreview = (text: string): string => {
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|p|blockquote])/, '<p>')
    .replace(/(?<![h|p|blockquote]>)$/, '</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-3]>)/g, '$1')
    .replace(/(<\/h[1-3]>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1');
};

/**
 * A simplified markdown editor specifically for character details
 * Provides markdown textarea with preview toggle and character count
 */
export const CharacterDetailsEditor: React.FC<CharacterDetailsEditorProps> = ({
  value,
  onChange,
  error,
  maxLength = 15000,
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <>
      <Container aria-invalid={!!error}>
        <Toolbar>
          <ToolbarButtons>
            <ToolbarButton
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              title={isPreviewMode ? 'Switch to edit mode' : 'Preview markdown'}
            >
              {isPreviewMode ? '✏️ Edit' : '👁️ Preview'}
            </ToolbarButton>
          </ToolbarButtons>
          <ToolbarHint>
            Markdown supported: **bold**, *italic*, ~~strikethrough~~, `code`, # headers, &gt; quotes
          </ToolbarHint>
        </Toolbar>

        {!isPreviewMode ? (
          <TextArea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Describe your character using markdown formatting...

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
- `inline code`
- > quotes"
            maxLength={maxLength}
          />
        ) : (
          <PreviewContainer>
            <PreviewContent
              dangerouslySetInnerHTML={{
                __html: value ? renderMarkdownPreview(value) : '<p style="color: #999;">No content to preview</p>'
              }}
            />
          </PreviewContainer>
        )}

        <Footer>
          <CharCount isNearLimit={isNearLimit}>
            {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
          </CharCount>
        </Footer>
      </Container>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
};
