import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { useAuth } from '../contexts/AuthContext';
import { useInviteCodeByIdQuery } from '../graphql/inviteCodes.graphql';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const signupSchema = z.object({
  inviteCode: z.string()
    .min(1, 'Invite code is required')
    .max(50, 'Invite code must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invite code can only contain letters, numbers, underscores, and hyphens'),
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  confirmPassword: z.string(),
  displayName: z.string().max(100, 'Display name must be less than 100 characters').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

const Container = styled.div`
  max-width: 400px;
  margin: 2rem auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing.xl};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: all 0.2s ease;
  
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
    background: ${({ theme }) => theme.colors.background};
  }
`;

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const HelpText = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const ValidationMessage = styled.div<{ $status: 'valid' | 'invalid' | 'loading' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ $status, theme }) => {
    switch ($status) {
      case 'valid': return theme.colors.success;
      case 'invalid': return theme.colors.error;
      case 'loading': return theme.colors.text.secondary;
    }
  }};
`;

const CommunityPreview = styled.div`
  background: ${({ theme }) => theme.colors.primary + '10'};
  border: 1px solid ${({ theme }) => theme.colors.primary + '30'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const CommunityInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const CommunityName = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary};
`;

const RoleInfo = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PreviewText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Footer = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoginLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

export const SignupPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const inviteCode = watch('inviteCode');
  
  // Auto-populate invite code from URL parameter
  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    if (inviteParam) {
      setValue('inviteCode', inviteParam);
    }
  }, [searchParams, setValue]);

  // Query to validate invite code
  const { data: inviteCodeData, loading: inviteCodeLoading, error: inviteCodeError } = useInviteCodeByIdQuery({
    variables: { id: inviteCode || '' },
    skip: !inviteCode || inviteCode.length < 2,
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      const success = await signup(
        data.username,
        data.email,
        data.password,
        data.displayName,
        data.inviteCode
      );
      if (success) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInviteCodeValidation = () => {
    if (!inviteCode || inviteCode.length < 2) return null;
    
    if (inviteCodeLoading) {
      return (
        <ValidationMessage $status="loading">
          <AlertTriangle size={16} />
          Checking invite code...
        </ValidationMessage>
      );
    }
    
    if (inviteCodeError || !inviteCodeData?.inviteCodeById) {
      return (
        <ValidationMessage $status="invalid">
          <XCircle size={16} />
          Invalid invite code
        </ValidationMessage>
      );
    }
    
    const code = inviteCodeData.inviteCodeById;
    if (!code.isAvailable) {
      return (
        <ValidationMessage $status="invalid">
          <XCircle size={16} />
          This invite code has been exhausted
        </ValidationMessage>
      );
    }
    
    return (
      <ValidationMessage $status="valid">
        <CheckCircle size={16} />
        Valid invite code ({code.remainingClaims} uses remaining)
      </ValidationMessage>
    );
  };

  return (
    <Container>
      <Card>
        <Title>Join CharDB</Title>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="inviteCode">Invite Code *</Label>
            <Input
              {...register('inviteCode')}
              type="text"
              id="inviteCode"
              placeholder="Enter your invite code"
            />
            {errors.inviteCode && <ErrorMessage>{errors.inviteCode.message}</ErrorMessage>}
            {getInviteCodeValidation()}
            {inviteCodeData?.inviteCodeById?.role && (
              <CommunityPreview>
                <CommunityInfo>
                  <CommunityName>{inviteCodeData.inviteCodeById.role.community.name}</CommunityName>
                  <RoleInfo>as {inviteCodeData.inviteCodeById.role.name}</RoleInfo>
                </CommunityInfo>
                <PreviewText>
                  You'll be joining this community and assigned the {inviteCodeData.inviteCodeById.role.name} role.
                </PreviewText>
              </CommunityPreview>
            )}
            {inviteCodeData?.inviteCodeById && !inviteCodeData.inviteCodeById.role && (
              <CommunityPreview>
                <PreviewText>
                  <strong>Site Registration:</strong> This code will give you access to the platform.
                </PreviewText>
              </CommunityPreview>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="username">Username</Label>
            <Input
              {...register('username')}
              type="text"
              id="username"
              placeholder="Choose a username"
            />
            {errors.username && <ErrorMessage>{errors.username.message}</ErrorMessage>}
            <HelpText>This will be your unique identifier on the platform</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              {...register('email')}
              type="email"
              id="email"
              placeholder="Enter your email"
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="displayName">Display Name (Optional)</Label>
            <Input
              {...register('displayName')}
              type="text"
              id="displayName"
              placeholder="How others will see your name"
            />
            {errors.displayName && <ErrorMessage>{errors.displayName.message}</ErrorMessage>}
            <HelpText>This can be different from your username</HelpText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="password">Password</Label>
            <Input
              {...register('password')}
              type="password"
              id="password"
              placeholder="Create a password"
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && <ErrorMessage>{errors.confirmPassword.message}</ErrorMessage>}
          </FormGroup>

          <Button type="submit" loading={isLoading} disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Form>

        <Footer>
          Already have an account?{' '}
          <LoginLink to="/login">Sign in here</LoginLink>
        </Footer>
      </Card>
    </Container>
  );
};