import React, { useState } from 'react';
import styled from 'styled-components';
import { Markdown } from './Markdown';

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

const TextArea = styled.textarea<{ $minHeight: string }>`
  width: 100%;
  min-height: ${({ $minHeight }) => $minHeight};
  padding: ${({ theme }) => theme.spacing.md};
  border: none;
  font-family: Monaco, Consolas, "Courier New", monospace;
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

const PreviewContainer = styled.div<{ $minHeight: string }>`
  padding: ${({ theme }) => theme.spacing.md};
  min-height: ${({ $minHeight }) => $minHeight};
  max-height: 600px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.background};
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

const CharCount = styled.span<{ $isNearLimit?: boolean }>`
  color: ${({ $isNearLimit, theme }) =>
    $isNearLimit ? theme.colors.error : theme.colors.text.muted};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.error}15;
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.error};
`;

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength?: number;
  disabled?: boolean;
  placeholder?: string;
  minHeight?: string;
}

/**
 * A reusable markdown editor with Edit/Preview toggle, markdown hints,
 * monospace textarea, character count footer, and error display.
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  error,
  maxLength = 3000,
  disabled = false,
  placeholder,
  minHeight = '150px',
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
            $minHeight={minHeight}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
          />
        ) : (
          <PreviewContainer $minHeight={minHeight}>
            {value ? <Markdown>{value}</Markdown> : <p style={{ color: '#999' }}>No content to preview</p>}
          </PreviewContainer>
        )}

        <Footer>
          <CharCount $isNearLimit={isNearLimit}>
            {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
          </CharCount>
        </Footer>
      </Container>

      {error && <ErrorMessage>{error}</ErrorMessage>}
    </>
  );
};
