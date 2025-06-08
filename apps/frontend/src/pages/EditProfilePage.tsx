import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import toast from 'react-hot-toast';
import { useMeQuery, useUpdateProfileMutation } from '../generated/graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';

const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  dateOfBirth: z.string().optional(),
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  margin: 0;
`;

const Form = styled.form`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Input = styled.input.withConfig({
  shouldForwardProp: (prop) => prop !== 'hasError',
})<{ hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme, hasError }) => 
    hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const TextArea = styled.textarea.withConfig({
  shouldForwardProp: (prop) => prop !== 'hasError',
})<{ hasError?: boolean }>`
  width: 100%;
  min-height: 120px;
  padding: 0.75rem ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme, hasError }) => 
    hasError ? theme.colors.error : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
  display: block;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: flex-end;
  margin-top: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  border: 2px solid ${({ theme, variant }) => 
    variant === 'secondary' ? theme.colors.border : theme.colors.primary};
  background: ${({ theme, variant }) => 
    variant === 'secondary' ? theme.colors.background : theme.colors.primary};
  color: ${({ theme, variant }) => 
    variant === 'secondary' ? theme.colors.text.primary : 'white'};
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;

  &:hover:not(:disabled) {
    background: ${({ theme, variant }) => 
      variant === 'secondary' ? theme.colors.surface : theme.colors.primary};
    opacity: ${({ variant }) => variant === 'secondary' ? 1 : 0.9};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const HelpText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

export const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: meData, loading: meLoading } = useMeQuery();
  const [updateProfile, { loading: updating }] = useUpdateProfileMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: '',
      bio: '',
      location: '',
      website: '',
      dateOfBirth: '',
    },
  });

  // Reset form with user data when it becomes available
  useEffect(() => {
    if (meData?.me) {
      reset({
        displayName: meData.me.displayName || '',
        bio: meData.me.bio || '',
        location: meData.me.location || '',
        website: meData.me.website || '',
        dateOfBirth: meData.me.dateOfBirth || '',
      });
    }
  }, [meData, reset]);

  const onSubmit = async (data: UpdateProfileFormData) => {
    try {
      // Remove empty strings and undefined values
      const input = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== '' && value !== undefined)
      );

      await updateProfile({
        variables: { input },
        refetchQueries: ['Me'],
      });

      toast.success('Profile updated successfully!');
      navigate(`/user/${meData?.me?.username}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate(`/user/${meData?.me?.username}`);
  };

  if (meLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (!meData?.me) {
    return (
      <Container>
        <div>Please log in to edit your profile.</div>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Edit Profile</Title>
        <Subtitle>Update your profile information</Subtitle>
      </Header>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormGroup>
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Enter your display name"
            hasError={!!errors.displayName}
            {...register('displayName')}
          />
          {errors.displayName && (
            <ErrorMessage>{errors.displayName.message}</ErrorMessage>
          )}
          <HelpText>This is how your name will appear to other users</HelpText>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="bio">Bio</Label>
          <TextArea
            id="bio"
            placeholder="Tell us about yourself..."
            hasError={!!errors.bio}
            {...register('bio')}
          />
          {errors.bio && (
            <ErrorMessage>{errors.bio.message}</ErrorMessage>
          )}
          <HelpText>A brief description about yourself (max 1000 characters)</HelpText>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            type="text"
            placeholder="Where are you located?"
            hasError={!!errors.location}
            {...register('location')}
          />
          {errors.location && (
            <ErrorMessage>{errors.location.message}</ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://your-website.com"
            hasError={!!errors.website}
            {...register('website')}
          />
          {errors.website && (
            <ErrorMessage>{errors.website.message}</ErrorMessage>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            hasError={!!errors.dateOfBirth}
            {...register('dateOfBirth')}
          />
          {errors.dateOfBirth && (
            <ErrorMessage>{errors.dateOfBirth.message}</ErrorMessage>
          )}
          <HelpText>This information is private and helps us provide age-appropriate content</HelpText>
        </FormGroup>

        <ButtonGroup>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={updating || !isDirty}
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  );
};