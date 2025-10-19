import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { toast } from 'react-hot-toast';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import {
  CREATE_TEXT_MEDIA,
  GET_CHARACTER_MEDIA,
  GET_MY_MEDIA,
  GET_MEDIA,
} from '../graphql/media.graphql';
import { useGetCharacterQuery } from '../graphql/characters.graphql';
import { useGetMyGalleriesQuery } from '../graphql/galleries.graphql';
import { TextFormatting, Visibility } from '../generated/graphql';
// import { TextEditor } from '../components/TextEditor';
import { useAuth } from '../contexts/AuthContext';

const textMediaSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters'),
  formatting: z.nativeEnum(TextFormatting),
  visibility: z.nativeEnum(Visibility),
  characterId: z.string().optional(),
  galleryId: z.string().optional(),
});

type TextMediaForm = z.infer<typeof textMediaSchema>;

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &::before {
    content: '←';
    font-weight: bold;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xl} 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const Section = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Input = styled.input`
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const Select = styled.select`
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &[aria-invalid='true'] {
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const ErrorMessage = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column-reverse;
  }
`;

const CancelButton = styled.button`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: transparent;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.text.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const CharacterInfo = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const CharacterName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;

const CharacterNote = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid ${({ theme }) => theme.colors.border};
  border-top: 4px solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export const CreateTextPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const characterId = searchParams.get('character');
  const galleryId = searchParams.get('gallery');

  const {
    register,
    handleSubmit,
    formState: { errors },
    // setValue,
    // watch,
  } = useForm<TextMediaForm>({
    resolver: zodResolver(textMediaSchema),
    defaultValues: {
      visibility: Visibility.Public,
      formatting: TextFormatting.Markdown,
      characterId: characterId || undefined,
      galleryId: galleryId || undefined,
    },
  });

  // const watchContent = watch('content');
  // const watchFormatting = watch('formatting');

  // Get character info if characterId is provided
  const { data: characterData } = useGetCharacterQuery({
    variables: { id: characterId! },
    skip: !characterId,
  });

  // Get user's galleries for selection
  const { data: galleriesData } = useGetMyGalleriesQuery({
    variables: {
      filters: {
        limit: 100, // Get all user galleries for selection
        offset: 0,
      },
    },
    skip: !user,
  });

  const galleries = galleriesData?.myGalleries?.galleries || [];

  const [createTextMedia] = useMutation(CREATE_TEXT_MEDIA, {
    refetchQueries: [
      { query: GET_MY_MEDIA },
      { query: GET_MEDIA },
      ...(characterId
        ? [
            {
              query: GET_CHARACTER_MEDIA,
              variables: { characterId, filters: { limit: 8 } },
            },
          ]
        : []),
    ],
  });

  const handleBackClick = () => {
    if (characterId) {
      navigate(`/character/${characterId}`);
    } else if (galleryId) {
      navigate(`/gallery/${galleryId}`);
    } else {
      navigate('/');
    }
  };

  const onSubmit = async (data: TextMediaForm) => {
    if (!user) {
      toast.error('You must be logged in to create content');
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean up empty strings
      const cleanData = {
        title: data.title,
        description: data.description || undefined,
        content: data.content,
        formatting: data.formatting,
        visibility: data.visibility,
        characterId: data.characterId || undefined,
        galleryId: data.galleryId || undefined,
      };

      const result = await createTextMedia({
        variables: {
          input: cleanData,
        },
      });

      toast.success('Text content created successfully!');

      // Navigate to the created media or back to character
      if (characterId) {
        navigate(`/character/${characterId}`);
      } else if (galleryId) {
        navigate(`/gallery/${galleryId}`);
      } else {
        navigate(`/media/${result.data.createTextMedia.id}`);
      }
    } catch (error) {
      console.error('Error creating text media:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create text content. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // const handleContentChange = (content: string) => {
  //   setValue('content', content);
  // };

  return (
    <>
      {isSubmitting && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}

      <Container>
        <BackButton onClick={handleBackClick}>
          {characterId
            ? 'Back to Character'
            : galleryId
              ? 'Back to Gallery'
              : 'Back'}
        </BackButton>

        <Title>Create Text Content</Title>

        {characterData?.character && (
          <CharacterInfo>
            <CharacterName>{characterData.character.name}</CharacterName>
            <CharacterNote>
              This text content will be associated with this character
            </CharacterNote>
          </CharacterInfo>
        )}

        <Form onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Information */}
          <Section>
            <SectionTitle>Basic Information</SectionTitle>

            <FormGroup>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                aria-invalid={!!errors.title}
                placeholder="Enter a title for your text content"
              />
              {errors.title && (
                <ErrorMessage>{errors.title.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="description">Description</Label>
              <TextArea
                id="description"
                {...register('description')}
                aria-invalid={!!errors.description}
                placeholder="Optional description or summary of your content..."
                rows={3}
              />
              {errors.description && (
                <ErrorMessage>{errors.description.message}</ErrorMessage>
              )}
            </FormGroup>
          </Section>

          {/* Content */}
          <Section>
            <SectionTitle>Content</SectionTitle>

            <FormRow>
              <FormGroup>
                <Label htmlFor="formatting">Formatting</Label>
                <Select
                  id="formatting"
                  {...register('formatting')}
                  aria-invalid={!!errors.formatting}
                >
                  <option value={TextFormatting.Markdown}>Markdown</option>
                  <option value={TextFormatting.Plaintext}>Plain Text</option>
                </Select>
                {errors.formatting && (
                  <ErrorMessage>{errors.formatting.message}</ErrorMessage>
                )}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  id="visibility"
                  {...register('visibility')}
                  aria-invalid={!!errors.visibility}
                >
                  <option value={Visibility.Public}>
                    Public - Visible to everyone
                  </option>
                  <option value={Visibility.Unlisted}>
                    Unlisted - Only visible with direct link
                  </option>
                  <option value={Visibility.Private}>
                    Private - Only visible to you
                  </option>
                </Select>
                {errors.visibility && (
                  <ErrorMessage>{errors.visibility.message}</ErrorMessage>
                )}
              </FormGroup>
            </FormRow>

            <FormGroup>
              <Label htmlFor="galleryId">Gallery (Optional)</Label>
              {galleries.length === 0 ? (
                <>
                  <Select id="galleryId" disabled>
                    <option>No galleries yet</option>
                  </Select>
                  <div style={{ marginTop: '0.5rem' }}>
                    <a
                      href="/gallery/create"
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--color-primary)',
                      }}
                    >
                      Create your first gallery
                    </a>
                  </div>
                </>
              ) : (
                <Select
                  id="galleryId"
                  {...register('galleryId')}
                  aria-invalid={!!errors.galleryId}
                >
                  <option value="">Select a gallery...</option>
                  {galleries.map((gallery) => (
                    <option key={gallery.id} value={gallery.id}>
                      {gallery.name}
                    </option>
                  ))}
                </Select>
              )}
              {errors.galleryId && (
                <ErrorMessage>{errors.galleryId.message}</ErrorMessage>
              )}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="content">Content *</Label>
              <TextArea
                id="content"
                {...register('content')}
                aria-invalid={!!errors.content}
                placeholder="Write your story, character description, backstory, or any other text content..."
                style={{ minHeight: '400px' }}
              />
              {errors.content && (
                <ErrorMessage>{errors.content.message}</ErrorMessage>
              )}
            </FormGroup>
          </Section>

          <ButtonRow>
            <CancelButton type="button" onClick={handleBackClick}>
              Cancel
            </CancelButton>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Text Content'}
            </Button>
          </ButtonRow>
        </Form>
      </Container>
    </>
  );
};
