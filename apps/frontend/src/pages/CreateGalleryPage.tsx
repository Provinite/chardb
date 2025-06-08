import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { CREATE_GALLERY, GET_GALLERIES } from '../graphql/galleries';
import { GET_MY_CHARACTERS, Character } from '../graphql/characters';

const gallerySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  characterId: z.string()
    .optional()
    .or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']),
  sortOrder: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseInt(val);
      return !isNaN(num) && num >= 0;
    }, 'Sort order must be a valid positive number'),
});

type GalleryForm = z.infer<typeof gallerySchema>;

const Container = styled.div`
  max-width: 800px;
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

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  &:last-child {
    margin-bottom: 0;
  }
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

  &[aria-invalid="true"] {
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

  &[aria-invalid="true"] {
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

  &[aria-invalid="true"] {
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

const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: ${({ theme }) => theme.spacing.xs} 0 0 0;
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
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const CreateGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GalleryForm>({
    resolver: zodResolver(gallerySchema),
    defaultValues: {
      visibility: 'PUBLIC',
    },
  });

  const [createGallery] = useMutation(CREATE_GALLERY, {
    refetchQueries: [{ query: GET_GALLERIES }],
  });

  // Fetch user's characters for the character association dropdown
  const { data: charactersData } = useQuery(GET_MY_CHARACTERS, {
    variables: { filters: { limit: 100 } },
  });

  const handleBackClick = () => {
    navigate('/galleries');
  };

  const onSubmit = async (data: GalleryForm) => {
    setIsSubmitting(true);
    try {
      // Process sort order
      const sortOrder = data.sortOrder && data.sortOrder !== '' ? parseInt(data.sortOrder) : undefined;

      // Clean up empty strings
      const cleanData = {
        name: data.name,
        description: data.description || undefined,
        characterId: data.characterId || undefined,
        visibility: data.visibility,
        sortOrder,
      };

      const result = await createGallery({
        variables: {
          input: cleanData,
        },
      });

      // Navigate to the newly created gallery
      navigate(`/gallery/${result.data.createGallery.id}`);
    } catch (error) {
      console.error('Error creating gallery:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isSubmitting && (
        <LoadingOverlay>
          <LoadingSpinner />
        </LoadingOverlay>
      )}
      
      <Container>
        <BackButton onClick={handleBackClick}>
          Back to Galleries
        </BackButton>

        <Title>Create New Gallery</Title>

        <Form onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Information */}
          <Section>
            <SectionTitle>Basic Information</SectionTitle>
            
            <FormGroup>
              <Label htmlFor="name">Gallery Name *</Label>
              <Input
                id="name"
                {...register('name')}
                aria-invalid={!!errors.name}
                placeholder="Enter gallery name"
              />
              {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="description">Description</Label>
              <TextArea
                id="description"
                {...register('description')}
                aria-invalid={!!errors.description}
                placeholder="Describe your gallery and what kind of images it contains..."
              />
              {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
            </FormGroup>
          </Section>

          {/* Settings */}
          <Section>
            <SectionTitle>Settings</SectionTitle>
            
            <FormRow>
              <FormGroup>
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  id="visibility"
                  {...register('visibility')}
                  aria-invalid={!!errors.visibility}
                >
                  <option value="PUBLIC">Public - Visible to everyone</option>
                  <option value="UNLISTED">Unlisted - Only visible with direct link</option>
                  <option value="PRIVATE">Private - Only visible to you</option>
                </Select>
                {errors.visibility && <ErrorMessage>{errors.visibility.message}</ErrorMessage>}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  {...register('sortOrder')}
                  aria-invalid={!!errors.sortOrder}
                  placeholder="0"
                />
                <HelpText>
                  Lower numbers appear first when sorting galleries
                </HelpText>
                {errors.sortOrder && <ErrorMessage>{errors.sortOrder.message}</ErrorMessage>}
              </FormGroup>
            </FormRow>
          </Section>

          {/* Character Association */}
          <Section>
            <SectionTitle>Character Association</SectionTitle>
            
            <FormGroup>
              <Label htmlFor="characterId">Associate with Character (Optional)</Label>
              <Select
                id="characterId"
                {...register('characterId')}
                aria-invalid={!!errors.characterId}
              >
                <option value="">No character association</option>
                {charactersData?.myCharacters.characters.map((character: Character) => (
                  <option key={character.id} value={character.id}>
                    {character.name} {character.species && `(${character.species})`}
                  </option>
                ))}
              </Select>
              <HelpText>
                Link this gallery to one of your characters to organize related artwork
              </HelpText>
              {errors.characterId && <ErrorMessage>{errors.characterId.message}</ErrorMessage>}
            </FormGroup>
          </Section>

          <ButtonRow>
            <CancelButton type="button" onClick={handleBackClick}>
              Cancel
            </CancelButton>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Gallery'}
            </Button>
          </ButtonRow>
        </Form>
      </Container>
    </>
  );
};