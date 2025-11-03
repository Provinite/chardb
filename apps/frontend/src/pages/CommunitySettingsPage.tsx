import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { Settings, ArrowLeft } from 'lucide-react';
import {
  Button,
  Heading2,
  SmallText,
  HelpText,
  ErrorMessage
} from '@chardb/ui';
import { useCommunityByIdQuery } from '../graphql/communities.graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DiscordIntegrationSettings } from '../components/DiscordIntegrationSettings';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BackButton = styled(Button)`
  padding: 0.5rem;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
`;

export const CommunitySettingsPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();

  const { data, loading, error, refetch } = useCommunityByIdQuery({
    variables: { id: communityId || '' },
    skip: !communityId,
  });

  if (!communityId) {
    return (
      <Container>
        <Heading2>Invalid Community</Heading2>
        <HelpText>Community ID is required to manage settings.</HelpText>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner size="lg" />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !data?.community) {
    return (
      <Container>
        <Header>
          <HeaderTop>
            <BackButton
              variant="outline"
              onClick={() => window.history.back()}
              icon={<ArrowLeft size={16} />}
            >
              Back
            </BackButton>
          </HeaderTop>
        </Header>
        <ErrorMessage message={error?.message || 'Community not found'} />
      </Container>
    );
  }

  const community = data.community;

  return (
    <Container>
      <Header>
        <HeaderTop>
          <BackButton
            variant="outline"
            onClick={() => window.history.back()}
            icon={<ArrowLeft size={16} />}
          >
            Back
          </BackButton>
        </HeaderTop>

        <HeaderContent>
          <HeaderInfo>
            <HeaderIcon>
              <Settings size={24} />
            </HeaderIcon>
            <HeaderText>
              <Heading2>{community.name} Settings</Heading2>
              <SmallText style={{ margin: 0, color: 'muted' }}>
                Configure community information and preferences
              </SmallText>
            </HeaderText>
          </HeaderInfo>
        </HeaderContent>
      </Header>

      <Content>
        <DiscordIntegrationSettings community={community} onUpdate={() => refetch()} />
      </Content>
    </Container>
  );
};