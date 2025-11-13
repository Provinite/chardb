import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { TextFormatting, Visibility } from '../generated/graphql';
import { Markdown } from './Markdown';

const Container = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
  }
`;

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 300px;
  padding: ${({ theme }) => theme.spacing.md};
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-family: Monaco, Consolas, "Courier New", monospace;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.6;
  resize: vertical;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Footer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ theme }) => theme.colors.surface};
`;

const WordCount = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${props => 
    props.variant === 'primary' 
      ? props.theme.colors.primary 
      : props.theme.colors.border
  };
  background: ${props => 
    props.variant === 'primary' 
      ? props.theme.colors.primary 
      : props.theme.colors.background
  };
  color: ${props => 
    props.variant === 'primary' 
      ? 'white' 
      : props.theme.colors.text.primary
  };
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s;
  
  &:hover:not(:disabled) {
    background: ${props => 
      props.variant === 'primary' 
        ? props.theme.colors.secondary
        : props.theme.colors.surface
    };
  }
  
  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PreviewContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  max-height: 200px;
  overflow-y: auto;
`;


/** Data structure for text editor content */
export interface TextEditorData {
  /** Title for the text content */
  title: string;
  /** Optional description */
  description?: string;
  /** The actual text content */
  content: string;
  /** Text formatting type */
  formatting: TextFormatting;
  /** Visibility setting */
  visibility: Visibility;
  /** Optional character association */
  characterId?: string;
  /** Optional gallery association */
  galleryId?: string;
}

interface TextEditorProps {
  /** Initial data to populate the editor */
  initialData?: Partial<TextEditorData>;
  /** Callback called when user saves the content */
  onSave: (data: TextEditorData) => void;
  /** Callback called when user cancels editing */
  onCancel: () => void;
  /** Whether the editor is in a loading state */
  isLoading?: boolean;
  /** Whether to show the markdown preview */
  showPreview?: boolean;
  /** Available characters for association */
  characters?: Array<{ id: string; name: string }>;
}

/**
 * Calculates the word count for text content
 */
const calculateWordCount = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};


/**
 * A rich text editor component with markdown support and live preview
 * Provides form inputs for title, description, content, and metadata
 */
export const TextEditor: React.FC<TextEditorProps> = ({
  initialData = {},
  onSave,
  onCancel,
  isLoading = false,
  showPreview = false,
  characters = [],
}) => {
  const [data, setData] = useState<TextEditorData>({
    title: initialData.title || '',
    description: initialData.description || '',
    content: initialData.content || '',
    formatting: initialData.formatting || TextFormatting.Plaintext,
    visibility: initialData.visibility || Visibility.Public,
    characterId: initialData.characterId,
    galleryId: initialData.galleryId,
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const wordCount = calculateWordCount(data.content);

  const handleSubmit = useCallback(() => {
    if (!data.title.trim() || !data.content.trim()) {
      return;
    }
    onSave(data);
  }, [data, onSave]);

  const canSave = data.title.trim() && data.content.trim() && !isLoading;

  const isMarkdown = data.formatting === TextFormatting.Markdown;

  return (
    <Container>
      <Header>
        <FormGrid>
          <FormField>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              value={data.title}
              onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter a title for your text..."
              maxLength={255}
            />
          </FormField>
          
          <FormField>
            <Label htmlFor="formatting">Format</Label>
            <Select
              id="formatting"
              value={data.formatting}
              onChange={(e) => setData(prev => ({ 
                ...prev, 
                formatting: e.target.value as TextFormatting 
              }))}
            >
              <option value={TextFormatting.Plaintext}>Plain Text</option>
              <option value={TextFormatting.Markdown}>Markdown</option>
            </Select>
          </FormField>
          
          <FormField>
            <Label htmlFor="visibility">Visibility</Label>
            <Select
              id="visibility"
              value={data.visibility}
              onChange={(e) => setData(prev => ({ 
                ...prev, 
                visibility: e.target.value as Visibility 
              }))}
            >
              <option value={Visibility.Public}>Public</option>
              <option value={Visibility.Unlisted}>Unlisted</option>
              <option value={Visibility.Private}>Private</option>
            </Select>
          </FormField>
          
          {characters.length > 0 && (
            <FormField>
              <Label htmlFor="character">Character (optional)</Label>
              <Select
                id="character"
                value={data.characterId || ''}
                onChange={(e) => setData(prev => ({ 
                  ...prev, 
                  characterId: e.target.value || undefined 
                }))}
              >
                <option value="">No character</option>
                {characters.map(char => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </Select>
            </FormField>
          )}
        </FormGrid>
        
        <FormField>
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            type="text"
            value={data.description}
            onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of your text..."
            maxLength={500}
          />
        </FormField>
      </Header>

      {!isPreviewMode ? (
        <TextArea
          value={data.content}
          onChange={(e) => setData(prev => ({ ...prev, content: e.target.value }))}
          placeholder={
            isMarkdown 
              ? "Start writing your text... You can use Markdown formatting:\n\n# Heading 1\n## Heading 2\n**Bold text**\n*Italic text*\n`Code`"
              : "Start writing your text..."
          }
        />
      ) : (
        <PreviewContainer>
          {isMarkdown ? (
            <Markdown>{data.content}</Markdown>
          ) : (
            <div style={{ whiteSpace: 'pre-wrap' }}>{data.content}</div>
          )}
        </PreviewContainer>
      )}

      <Footer>
        <WordCount>
          {wordCount} words
        </WordCount>
        
        <ButtonGroup>
          {showPreview && isMarkdown && (
            <Button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              disabled={isLoading}
            >
              {isPreviewMode ? 'Edit' : 'Preview'}
            </Button>
          )}
          
          <Button onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </ButtonGroup>
      </Footer>
    </Container>
  );
};