import React, { useState } from 'react';
import styled from 'styled-components';
import { TextContent, TextFormatting } from '../generated/graphql';

const Container = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.colors.surface};
`;

const WordCount = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const FormatToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  align-items: center;
`;

const ToggleButton = styled.button<{ active: boolean }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${props => props.active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${props => props.active ? 'white' : props.theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const ContentContainer = styled.div<{ maxHeight?: string }>`
  padding: ${({ theme }) => theme.spacing.lg};
  max-height: ${props => props.maxHeight || 'none'};
  overflow-y: auto;
`;

const PlainTextContent = styled.div`
  font-family: 'Monaco, Consolas, "Courier New", monospace';
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const MarkdownContent = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.primary};
  
  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.colors.text.primary};
    margin: ${({ theme }) => theme.spacing.lg} 0 ${({ theme }) => theme.spacing.md} 0;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  h1 { font-size: 2em; }
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.25em; }
  
  p {
    margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  strong, b {
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }
  
  em, i {
    font-style: italic;
  }
  
  code {
    background: ${({ theme }) => theme.colors.surface};
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Monaco, Consolas, "Courier New", monospace';
    font-size: 0.9em;
  }
  
  pre {
    background: ${({ theme }) => theme.colors.surface};
    padding: ${({ theme }) => theme.spacing.md};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    overflow-x: auto;
    margin: ${({ theme }) => theme.spacing.md} 0;
    
    code {
      background: none;
      padding: 0;
    }
  }
  
  blockquote {
    border-left: 3px solid ${({ theme }) => theme.colors.border};
    padding-left: ${({ theme }) => theme.spacing.md};
    margin: ${({ theme }) => theme.spacing.md} 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    font-style: italic;
  }
  
  ul, ol {
    margin: ${({ theme }) => theme.spacing.md} 0;
    padding-left: ${({ theme }) => theme.spacing.lg};
  }
  
  li {
    margin: ${({ theme }) => theme.spacing.xs} 0;
  }
  
  hr {
    border: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    margin: ${({ theme }) => theme.spacing.lg} 0;
  }
`;

const ExpandButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary}10;
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`;

interface TextViewerProps {
  /** The text content to display */
  textContent: TextContent;
  /** Maximum height before showing expand button */
  maxHeight?: string;
  /** Whether to show word count in header */
  showWordCount?: boolean;
  /** Whether to allow switching between raw and formatted view */
  allowFormatToggle?: boolean;
}

/**
 * Simple markdown-to-HTML converter for basic formatting
 * Supports headers, bold, italic, code, and basic structure
 */
const renderMarkdown = (text: string): string => {
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    // Fix empty paragraphs
    .replace(/<p><\/p>/g, '');
};

/**
 * A component for displaying text content with optional markdown formatting
 * Supports collapsible content and format switching between raw and rendered text
 */
export const TextViewer: React.FC<TextViewerProps> = ({
  textContent,
  maxHeight = '400px',
  showWordCount = true,
  allowFormatToggle = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'raw' | 'formatted'>('formatted');
  
  const shouldShowExpandButton = maxHeight && !isExpanded;
  const displayHeight = isExpanded ? 'none' : maxHeight;
  
  const isMarkdown = textContent.formatting === TextFormatting.Markdown;
  const showFormatToggle = allowFormatToggle && isMarkdown;
  
  const renderContent = () => {
    if (!isMarkdown || viewMode === 'raw') {
      return (
        <PlainTextContent>
          {textContent.content}
        </PlainTextContent>
      );
    }
    
    return (
      <MarkdownContent
        dangerouslySetInnerHTML={{
          __html: renderMarkdown(textContent.content)
        }}
      />
    );
  };

  return (
    <Container>
      {(showWordCount || showFormatToggle) && (
        <Header>
          {showWordCount && (
            <WordCount>
              {textContent.wordCount} words
            </WordCount>
          )}
          {showFormatToggle && (
            <FormatToggle>
              <ToggleButton
                active={viewMode === 'formatted'}
                onClick={() => setViewMode('formatted')}
              >
                Formatted
              </ToggleButton>
              <ToggleButton
                active={viewMode === 'raw'}
                onClick={() => setViewMode('raw')}
              >
                Raw
              </ToggleButton>
            </FormatToggle>
          )}
        </Header>
      )}
      
      <ContentContainer maxHeight={displayHeight}>
        {renderContent()}
      </ContentContainer>
      
      {shouldShowExpandButton && (
        <ExpandButton onClick={() => setIsExpanded(true)}>
          Show More
        </ExpandButton>
      )}
    </Container>
  );
};