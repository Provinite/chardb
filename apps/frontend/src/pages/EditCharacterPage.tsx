import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { 
  useGetCharacterQuery,
  useUpdateCharacterMutation,
  UpdateCharacterInput,
  Visibility
} from '../graphql/characters';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  padding-bottom: ${({ theme }) => theme.spacing.xs};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.md};
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const Input = styled.input<{ hasError?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 2px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const TextArea = styled.textarea<{ hasError?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 2px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Select = styled.select<{ hasError?: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 2px solid ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme, hasError }) => hasError ? theme.colors.error : theme.colors.primary};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};
  padding-top: ${({ theme }) => theme.spacing.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};
`;

export const EditCharacterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, loading, error } = useGetCharacterQuery({
    variables: { id: id! },
    skip: !id,
  });

  const [updateCharacter] = useUpdateCharacterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CharacterForm>({
    resolver: zodResolver(characterSchema),
    defaultValues: {
      name: '',
      species: '',
      age: '',
      gender: '',
      description: '',
      personality: '',
      backstory: '',
      visibility: 'PUBLIC',
      isSellable: false,
      isTradeable: false,
      price: '',
    },
  });

  const character = data?.character;

  // Reset form when character data loads
  useEffect(() => {
    if (character) {
      reset({
        name: character.name,
        species: character.species || '',
        age: character.age || '',
        gender: character.gender || '',
        description: character.description || '',
        personality: character.personality || '',
        backstory: character.backstory || '',
        visibility: character.visibility,
        isSellable: character.isSellable,
        isTradeable: character.isTradeable,
        price: character.price?.toString() || '',
      });
    }
  }, [character, reset]);

  const isSellable = watch('isSellable');

  const onSubmit = async (data: CharacterForm) => {
    if (!character || !user) return;

    setIsSubmitting(true);
    try {
      const input: UpdateCharacterInput = {
        name: data.name,
        species: data.species || undefined,
        age: data.age || undefined,
        gender: data.gender || undefined,
        description: data.description || undefined,
        personality: data.personality || undefined,
        backstory: data.backstory || undefined,
        visibility: data.visibility as Visibility,
        isSellable: data.isSellable,
        isTradeable: data.isTradeable,
        price: data.price && data.isSellable ? parseFloat(data.price) : undefined,
      };

      await updateCharacter({
        variables: {
          id: character.id,
          input,
        },
      });

      toast.success('Character updated successfully!');
      navigate(`/character/${character.id}`);
    } catch (error) {
      console.error('Failed to update character:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update character. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate(`/character/${id}`);
  };

  // Check if user owns this character
  if (character && user && character.owner.id !== user.id) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Access Denied</h3>
          <p>You can only edit your own characters.</p>
        </ErrorContainer>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !character) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Character not found</h3>
          <p>The character you are trying to edit does not exist or you do not have permission to view it.</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton onClick={handleBack}>
        Back to Character
      </BackButton>

      <Title>Edit Character</Title>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormSection>
          <SectionTitle>Basic Information</SectionTitle>
          
          <FormRow>
            <FormGroup>
              <Label>Name *</Label>
              <Input
                {...register('name')}
                placeholder="Character name"
                hasError={!!errors.name}
              />
              {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label>Species</Label>
              <Input
                {...register('species')}
                placeholder="e.g., Dragon, Wolf, Human"
                hasError={!!errors.species}
              />
              {errors.species && <ErrorMessage>{errors.species.message}</ErrorMessage>}
            </FormGroup>
          </FormRow>

          <FormRow>
            <FormGroup>
              <Label>Age</Label>
              <Input
                {...register('age')}
                placeholder="e.g., 25, Young Adult"
                hasError={!!errors.age}
              />
              {errors.age && <ErrorMessage>{errors.age.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label>Gender</Label>
              <Input
                {...register('gender')}
                placeholder="e.g., Male, Female, Non-binary"
                hasError={!!errors.gender}
              />
              {errors.gender && <ErrorMessage>{errors.gender.message}</ErrorMessage>}
            </FormGroup>
          </FormRow>
        </FormSection>

        <FormSection>
          <SectionTitle>Character Details</SectionTitle>

          <FormGroup>
            <Label>Description</Label>
            <TextArea
              {...register('description')}
              placeholder="Brief description of your character's appearance and key traits..."
              hasError={!!errors.description}
            />
            {errors.description && <ErrorMessage>{errors.description.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label>Personality</Label>
            <TextArea
              {...register('personality')}
              placeholder="Your character's personality traits, quirks, and behavior..."
              hasError={!!errors.personality}
            />
            {errors.personality && <ErrorMessage>{errors.personality.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label>Backstory</Label>
            <TextArea
              {...register('backstory')}
              placeholder="Your character's history, origin story, and background..."
              hasError={!!errors.backstory}
              style={{ minHeight: '150px' }}
            />
            {errors.backstory && <ErrorMessage>{errors.backstory.message}</ErrorMessage>}
          </FormGroup>
        </FormSection>

        <FormSection>
          <SectionTitle>Settings & Trading</SectionTitle>

          <FormRow>
            <FormGroup>
              <Label>Visibility</Label>
              <Select {...register('visibility')} hasError={!!errors.visibility}>
                <option value="PUBLIC">Public - Anyone can view</option>
                <option value="UNLISTED">Unlisted - Only with direct link</option>
                <option value="PRIVATE">Private - Only you can view</option>
              </Select>
              {errors.visibility && <ErrorMessage>{errors.visibility.message}</ErrorMessage>}
            </FormGroup>

            <FormGroup>
              <Label>Trading Options</Label>
              <CheckboxGroup>
                <CheckboxLabel>
                  <Checkbox {...register('isTradeable')} />
                  Available for trading
                </CheckboxLabel>
                <CheckboxLabel>
                  <Checkbox {...register('isSellable')} />
                  Available for sale
                </CheckboxLabel>
              </CheckboxGroup>
            </FormGroup>
          </FormRow>

          {isSellable && (
            <FormGroup>
              <Label>Price (USD)</Label>
              <Input
                {...register('price')}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                hasError={!!errors.price}
              />
              {errors.price && <ErrorMessage>{errors.price.message}</ErrorMessage>}
            </FormGroup>
          )}
        </FormSection>

        <Actions>
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Actions>
      </Form>
    </Container>
  );
};