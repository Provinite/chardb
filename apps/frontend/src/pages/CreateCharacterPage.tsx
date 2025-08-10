import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { toast } from 'react-hot-toast';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { CREATE_CHARACTER, GET_CHARACTERS, GET_MY_CHARACTERS } from '../graphql/characters';

const characterSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  species: z.string()
    .max(50, 'Species must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  age: z.string()
    .max(20, 'Age must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  gender: z.string()
    .max(20, 'Gender must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  personality: z.string()
    .max(2000, 'Personality must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  backstory: z.string()
    .max(5000, 'Backstory must be less than 5000 characters')
    .optional()
    .or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']),
  isSellable: z.boolean(),
  isTradeable: z.boolean(),
  price: z.string()
    .optional()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, 'Price must be a valid positive number'),
  tags: z.string()
    .optional()
    .or(z.literal('')),
});

type CharacterForm = z.infer<typeof characterSchema>;

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

const CheckboxRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const CheckboxGroup = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${({ theme }) => theme.colors.primary};
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

const TagsHelp = styled.p`
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

export const CreateCharacterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CharacterForm>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      visibility: 'PUBLIC',
      isSellable: false,
      isTradeable: false,
    },
  });

  const [createCharacter] = useMutation(CREATE_CHARACTER, {
    refetchQueries: [
      { query: GET_CHARACTERS },
      { query: GET_MY_CHARACTERS },
    ],
  });

  const isSellable = watch('isSellable');

  const handleBackClick = () => {
    navigate('/characters');
  };

  const onSubmit = async (data: CharacterForm) => {
    setIsSubmitting(true);
    try {
      // Process tags
      const tags = data.tags
        ? data.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      // Process price
      const price = data.price && data.price !== '' ? parseFloat(data.price) : undefined;

      // Clean up empty strings
      const cleanData = {
        name: data.name,
        species: data.species || undefined,
        age: data.age || undefined,
        gender: data.gender || undefined,
        description: data.description || undefined,
        personality: data.personality || undefined,
        backstory: data.backstory || undefined,
        visibility: data.visibility,
        isSellable: data.isSellable,
        isTradeable: data.isTradeable,
        price,
        tags,
      };

      const result = await createCharacter({
        variables: {
          input: cleanData,
        },
      });

      // Navigate to the newly created character
      toast.success('Character created successfully!');
      navigate(`/character/${result.data.createCharacter.id}`);
    } catch (error) {
      console.error('Error creating character:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create character. Please try again.');
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
          Back to Characters
        </BackButton>

        <Title>Create New Character</Title>

        <Form onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Information */}
          <Section>
            <SectionTitle>Basic Information</SectionTitle>
            
            <FormGroup>
              <Label htmlFor="name">Character Name *</Label>
              <Input
                id="name"
                {...register('name')}
                aria-invalid={!!errors.name}
                placeholder="Enter character name"
              />
              {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
            </FormGroup>

            <FormRow>
              <FormGroup>
                <Label htmlFor="species">Species</Label>
                <Select
                  id="species"
                  {...register('species')}
                  aria-invalid={!!errors.species}
                >
                  <option value="">Select species</option>
                  <option value="Dragon">Dragon</option>
                  <option value="Wolf">Wolf</option>
                  <option value="Cat">Cat</option>
                  <option value="Fox">Fox</option>
                  <option value="Human">Human</option>
                  <option value="Other">Other</option>
                </Select>
                {errors.species && <ErrorMessage>{errors.species.message}</ErrorMessage>}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  {...register('age')}
                  aria-invalid={!!errors.age}
                  placeholder="e.g., 25, Young Adult"
                />
                {errors.age && <ErrorMessage>{errors.age.message}</ErrorMessage>}
              </FormGroup>

              <FormGroup>
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  {...register('gender')}
                  aria-invalid={!!errors.gender}
                  placeholder="e.g., Male, Female, Non-binary"
                />
                {errors.gender && <ErrorMessage>{errors.gender.message}</ErrorMessage>}
              </FormGroup>
            </FormRow>
          </Section>

          {/* Character Details */}
          <Section>
            <SectionTitle>Character Details</SectionTitle>
            
            <FormGroup>
              <Label htmlFor="description">Description</Label>
              <TextArea
                id="description"
                {...register('description')}
                aria-invalid={!!errors.description}
                placeholder="Describe your character's appearance and general traits..."
              />
              {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="personality">Personality</Label>
              <TextArea
                id="personality"
                {...register('personality')}
                aria-invalid={!!errors.personality}
                placeholder="Describe your character's personality, quirks, and behavior..."
              />
              {errors.personality && <ErrorMessage>{errors.personality.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="backstory">Backstory</Label>
              <TextArea
                id="backstory"
                {...register('backstory')}
                aria-invalid={!!errors.backstory}
                placeholder="Share your character's history, background, and story..."
                style={{ minHeight: '150px' }}
              />
              {errors.backstory && <ErrorMessage>{errors.backstory.message}</ErrorMessage>}
            </FormGroup>
          </Section>

          {/* Settings */}
          <Section>
            <SectionTitle>Settings</SectionTitle>
            
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

            <CheckboxRow>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  {...register('isSellable')}
                />
                Available for sale
              </CheckboxGroup>

              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  {...register('isTradeable')}
                />
                Open to trades
              </CheckboxGroup>
            </CheckboxRow>

            {isSellable && (
              <FormGroup>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  pattern="^[0-9]*\.?[0-9]*$"
                  {...register('price')}
                  aria-invalid={!!errors.price}
                  placeholder="0.00"
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    const value = target.value;
                    // Remove any invalid characters, keeping only digits and decimal point
                    const cleaned = value.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      target.value = parts[0] + '.' + parts.slice(1).join('');
                    } else {
                      target.value = cleaned;
                    }
                  }}
                />
                {errors.price && <ErrorMessage>{errors.price.message}</ErrorMessage>}
              </FormGroup>
            )}
          </Section>

          {/* Tags */}
          <Section>
            <SectionTitle>Tags</SectionTitle>
            
            <FormGroup>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                {...register('tags')}
                aria-invalid={!!errors.tags}
                placeholder="fantasy, original, cute, warrior"
              />
              <TagsHelp>
                Add tags separated by commas to help others find your character
              </TagsHelp>
              {errors.tags && <ErrorMessage>{errors.tags.message}</ErrorMessage>}
            </FormGroup>
          </Section>

          <ButtonRow>
            <CancelButton type="button" onClick={handleBackClick}>
              Cancel
            </CancelButton>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Character'}
            </Button>
          </ButtonRow>
        </Form>
      </Container>
    </>
  );
};