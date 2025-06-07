import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { useAuth } from '../contexts/AuthContext';

const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
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
  background: white;
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
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
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
  const { signup } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    try {
      const success = await signup(
        data.username,
        data.email,
        data.password,
        data.displayName
      );
      if (success) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Title>Join ThClone</Title>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
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