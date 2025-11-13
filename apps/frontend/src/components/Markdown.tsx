import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';

const StyledMarkdown = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: ${({ theme }) => theme.spacing.md} 0 ${({ theme }) => theme.spacing.sm};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }

  h1 {
    font-size: ${({ theme }) => theme.typography.fontSize.xl};
  }
  h2 {
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
  }
  h3 {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
  }

  p {
    margin: ${({ theme }) => theme.spacing.sm} 0;
  }

  strong {
    font-weight: bold;
  }

  em {
    font-style: italic;
  }

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

  ul {
    margin: ${({ theme }) => theme.spacing.sm} 0;
    padding-left: ${({ theme }) => theme.spacing.lg};
    list-style-type: disc;
  }

  ol {
    margin: ${({ theme }) => theme.spacing.sm} 0;
    padding-left: ${({ theme }) => theme.spacing.lg};
    list-style-type: decimal;
  }

  li {
    margin: ${({ theme }) => theme.spacing.xs} 0;
  }

  del {
    text-decoration: line-through;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: ${({ theme }) => theme.spacing.md} 0;
  }

  th,
  td {
    border: 1px solid ${({ theme }) => theme.colors.border};
    padding: ${({ theme }) => theme.spacing.sm};
    text-align: left;
  }

  th {
    background: ${({ theme }) => theme.colors.surface};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

interface MarkdownProps {
  children: string;
}

/**
 * Simple markdown renderer using react-markdown
 * Preserves line breaks (including single newlines) and handles GitHub Flavored Markdown
 * Supports: headers, bold, italic, strikethrough, code, blockquotes, tables, task lists
 */
export const Markdown: React.FC<MarkdownProps> = ({ children }) => {
  return (
    <StyledMarkdown>
      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]}>
        {children}
      </ReactMarkdown>
    </StyledMarkdown>
  );
};
