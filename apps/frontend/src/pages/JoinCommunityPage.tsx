import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import styled from 'styled-components';
import { Button, Card, Title, Subtitle, Input, Label, ErrorText } from '@chardb/ui';
import { useAuth } from '../contexts/AuthContext';
import { useInviteCodeByIdQuery, useClaimInviteCodeMutation } from '../graphql/inviteCodes.graphql';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const inviteCodeSchema = z.object({
  inviteCode: z.string()
    .min(1, 'Invite code is required')
    .max(50, 'Invite code must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invite code can only contain letters, numbers, underscores, and hyphens'),
});

type InviteCodeForm = z.infer<typeof inviteCodeSchema>;

const Container = styled.div`
  max-width: 500px;
  margin: 2rem auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
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

export const JoinCommunityPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InviteCodeForm>({
    resolver: zodResolver(inviteCodeSchema),
  });

  const inviteCode = watch('inviteCode');

  // Auto-populate invite code from URL parameter
  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    if (inviteParam) {
      setValue('inviteCode', inviteParam);
    }
  }, [searchParams, setValue]);

  const { data: inviteCodeData, loading: inviteCodeLoading, error: inviteCodeError } = useInviteCodeByIdQuery({
    variables: { id: inviteCode || '' },
    skip: !inviteCode || inviteCode.length < 2,
  });

  const [claimInviteCode] = useClaimInviteCodeMutation();

  const onSubmit = async (data: InviteCodeForm) => {
    if (!user) {
      toast.error('You must be logged in to join a community');
      return;
    }

    setIsLoading(true);
    try {
      const result = await claimInviteCode({
        variables: {
          id: data.inviteCode,
          claimInviteCodeInput: {
            userId: user.id,
          },
        },
      });

      if (result.data?.claimInviteCode) {
        const claimedCode = result.data.claimInviteCode;
        if (claimedCode.role) {
          toast.success(`Successfully joined ${claimedCode.role.community.name} as ${claimedCode.role.name}!`);
          navigate(`/communities/${claimedCode.role.community.id}`);
        } else {
          toast.success('Successfully claimed invite code!');
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Claim invite code error:', error);
      const errorMessage =
        error?.graphQLErrors?.[0]?.message ||
        error?.networkError?.message ||
        error?.message ||
        'Failed to claim invite code';
      toast.error(errorMessage);
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

  if (!user) {
    return (
      <Container>
        <Card>
          <Title>Join Community</Title>
          <Subtitle>You must be logged in to join a community</Subtitle>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Title>Join Community</Title>
        <Subtitle>Enter an invite code to join a community</Subtitle>
        
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="inviteCode">Invite Code</Label>
            <Input
              {...register('inviteCode')}
              type="text"
              id="inviteCode"
              placeholder="Enter your invite code"
              hasError={!!errors.inviteCode}
            />
            {errors.inviteCode && <ErrorText>{errors.inviteCode.message}</ErrorText>}
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
                  <strong>Site Registration:</strong> This code will give you platform access.
                </PreviewText>
              </CommunityPreview>
            )}
          </FormGroup>

          <Button 
            type="submit" 
            loading={isLoading} 
            disabled={isLoading || inviteCodeLoading || !inviteCodeData?.inviteCodeById?.isAvailable}
          >
            {isLoading ? 'Joining Community...' : 'Join Community'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};