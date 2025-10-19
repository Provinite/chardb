import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardActions,
  CardBadge,
  Title,
  Subtitle,
  Button,
  SmallText,
  Heading3,
} from '@chardb/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useCommunityMembersByUserQuery } from '../graphql/communities.graphql';
import { Users, Calendar, ExternalLink } from 'lucide-react';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const CommunitiesGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing.lg};
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
`;

const CommunityCard = styled(Card)`
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ClickableCommunityCard = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;

  ${CommunityCard} {
    cursor: pointer;
  }
`;

const CommunityHeader = styled(CardHeader)`
  align-items: center;
`;

const CommunityTitle = styled(CardTitle)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CommunityIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${({ theme }) => theme.colors.primary}20;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: 0.5;
`;

const EmptyDescription = styled(SmallText)`
  max-width: 400px;
  margin: 0 auto ${({ theme }) => theme.spacing.lg} auto;
  text-align: center;
`;

const EmptyActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  justify-content: center;
  flex-wrap: wrap;
`;

export const MyCommunitiesPage: React.FC = () => {
  const { user } = useAuth();

  const { data, loading, error } = useCommunityMembersByUserQuery({
    variables: { userId: user?.id || '', first: 50 },
    skip: !user?.id,
  });

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>My Communities</Title>
          <Subtitle>Communities you're a member of</Subtitle>
        </Header>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '4rem 0',
          }}
        >
          <LoadingSpinner size="lg" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>My Communities</Title>
          <Subtitle>Communities you're a member of</Subtitle>
        </Header>
        <EmptyState>
          <EmptyIcon>⚠️</EmptyIcon>
          <Heading3>Error loading communities</Heading3>
          <EmptyDescription>
            Unable to load your communities. Please try refreshing the page.
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  const communities = data?.communityMembersByUser?.nodes || [];

  if (communities.length === 0) {
    return (
      <Container>
        <Header>
          <Title>My Communities</Title>
          <Subtitle>Communities you're a member of</Subtitle>
        </Header>
        <EmptyState>
          <EmptyIcon>🏘️</EmptyIcon>
          <Heading3>No communities yet</Heading3>
          <EmptyDescription>
            You're not a member of any communities yet. Join a community to
            connect with other users and access exclusive content.
          </EmptyDescription>
          <EmptyActions>
            <Button
              as={Link}
              to="/join-community"
              variant="primary"
              icon={<Users size={16} />}
            >
              Join Community
            </Button>
          </EmptyActions>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Communities</Title>
        <Subtitle>
          You're a member of {communities.length} communit
          {communities.length === 1 ? 'y' : 'ies'}
        </Subtitle>
      </Header>

      <CommunitiesGrid>
        {communities.map((membership) => (
          <ClickableCommunityCard
            key={membership.id}
            to={`/communities/${membership.role.community.id}`}
          >
            <CommunityCard>
              <CommunityHeader>
                <CommunityTitle>
                  <CommunityIcon>
                    <Users size={20} />
                  </CommunityIcon>
                  <div>
                    <div>{membership.role.community.name}</div>
                    <CardBadge>{membership.role.name}</CardBadge>
                  </div>
                </CommunityTitle>
              </CommunityHeader>

              <CardContent>
                <MetaRow>
                  <Calendar size={14} />
                  <SmallText>
                    Joined {new Date(membership.createdAt).toLocaleDateString()}
                  </SmallText>
                </MetaRow>
              </CardContent>

              <CardActions
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <Button
                  as={Link}
                  to={`/communities/${membership.role.community.id}/admin`}
                  variant="primary"
                  size="sm"
                  icon={<ExternalLink size={14} />}
                >
                  Manage Community
                </Button>
              </CardActions>
            </CommunityCard>
          </ClickableCommunityCard>
        ))}
      </CommunitiesGrid>
    </Container>
  );
};
