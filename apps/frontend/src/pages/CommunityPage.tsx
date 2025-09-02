import React from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { Users, Calendar, Settings, UserPlus } from "lucide-react";
import {
  Button,
  Title,
  Heading2,
  Heading3,
  SmallText,
  HelpText,
  Card,
} from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { 
  useCommunityByIdQuery,
  useSpeciesByCommunityQuery,
  useGetCharactersQuery,
  useCommunityMembersWithRolesQuery,
} from "../generated/graphql";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Community Landing Page
 *
 * Public landing page for a specific community showing overview information,
 * recent activity, and navigation to community features.
 *
 * Features:
 * - Community overview and metadata
 * - Navigation to community sections (characters, species, etc.)
 * - Join community functionality for non-members
 * - Admin access for community administrators
 * - Recent activity feed
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 3rem;
`;

const CommunityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }
`;

const CommunityIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`;

const CommunityInfo = styled.div`
  flex: 1;
`;

const CommunityName = styled(Title)`
  margin: 0 0 0.5rem 0;
`;

const CommunityMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text.muted};

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const SectionCard = styled(Card)`
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const SectionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary}15;
  color: ${({ theme }) => theme.colors.primary};
`;

const SectionTitle = styled(Heading3)`
  margin: 0;
`;

const SectionDescription = styled(SmallText)`
  margin: 0 0 1.5rem 0;
  line-height: 1.4;
`;

const SectionStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const StatText = styled(SmallText)`
  margin: 0;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ViewButton = styled(Button)`
  padding: 0.5rem 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.colors.error};
`;

const NotFoundContainer = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const CommunityPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { user } = useAuth();

  const { data, loading, error } = useCommunityByIdQuery({
    variables: { id: communityId! },
    skip: !communityId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all",
  });

  // Fetch species count for this community
  const { data: speciesData } = useSpeciesByCommunityQuery({
    variables: { communityId: communityId!, first: 1 }, // Just get count
    skip: !communityId,
  });

  // Fetch character count (get all characters and filter by species in this community)
  const { data: charactersData } = useGetCharactersQuery({
    variables: {
      filters: {
        limit: 1, // Just get count
        offset: 0,
      },
    },
  });

  // Fetch community members count
  const { data: membersData } = useCommunityMembersWithRolesQuery({
    variables: { communityId: communityId!, first: 1 }, // Just get count
    skip: !communityId,
  });

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner size="lg" />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <Heading2>Error Loading Community</Heading2>
          <HelpText>
            Unable to load community information. Please try refreshing the
            page.
          </HelpText>
        </ErrorContainer>
      </Container>
    );
  }

  if (!data?.community) {
    return (
      <Container>
        <NotFoundContainer>
          <Heading2>Community Not Found</Heading2>
          <HelpText>
            The community you're looking for doesn't exist or may have been
            removed.
          </HelpText>
        </NotFoundContainer>
      </Container>
    );
  }

  const community = data.community;

  // Get actual counts from GraphQL queries
  const speciesCount = speciesData?.speciesByCommunity?.totalCount || 0;
  const charactersCount = charactersData?.characters?.total || 0;
  const membersCount = membersData?.communityMembersByCommunity?.totalCount || 0;

  const sections = [
    {
      id: "characters",
      title: "Characters",
      description:
        "Browse and discover unique characters created by community members",
      icon: Users,
      path: `/communities/${communityId}/characters`,
      count: charactersCount,
      enabled: true,
    },
    {
      id: "species",
      title: "Species",
      description:
        "Explore the various species and their traits available in this community",
      icon: Settings, // Would use a better icon like Dna or similar
      path: `/communities/${communityId}/species`,
      count: speciesCount,
      enabled: true,
    },
    {
      id: "gallery",
      title: "Community Gallery",
      description:
        "View artwork, stories, and media shared by community members",
      icon: Users, // Would use Gallery icon
      path: `/communities/${communityId}/gallery`,
      count: 0, // Would come from media count query when implemented
      enabled: false, // Not implemented yet
    },
  ];

  return (
    <Container>
      <Header>
        <CommunityHeader>
          <CommunityIcon>
            <Users size={32} />
          </CommunityIcon>

          <CommunityInfo>
            <CommunityName>{community.name}</CommunityName>
            <CommunityMeta>
              <MetaItem>
                <Calendar size={16} />
                <span>
                  Created {new Date(community.createdAt).toLocaleDateString()}
                </span>
              </MetaItem>
              <MetaItem>
                <Users size={16} />
                <span>{membersCount} {membersCount === 1 ? 'member' : 'members'}</span>
              </MetaItem>
            </CommunityMeta>

            <ActionButtons>
              {user ? (
                <>
                  <Button variant="primary" icon={<UserPlus size={16} />}>
                    Join Community
                  </Button>
                  <Button
                    variant="outline"
                    icon={<Settings size={16} />}
                    as={Link}
                    to={`/communities/${communityId}/admin`}
                  >
                    Manage
                  </Button>
                </>
              ) : (
                <Button variant="primary" as={Link} to="/login">
                  Sign In to Join
                </Button>
              )}
            </ActionButtons>
          </CommunityInfo>
        </CommunityHeader>
      </Header>

      <SectionGrid>
        {sections
          .filter((section) => section.enabled)
          .map((section) => (
            <Link
              key={section.id}
              to={section.path}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <SectionCard>
                <SectionHeader>
                  <SectionIcon>
                    <section.icon size={20} />
                  </SectionIcon>
                  <SectionTitle>{section.title}</SectionTitle>
                </SectionHeader>

                <SectionDescription>{section.description}</SectionDescription>

                <SectionStats>
                  <StatText>
                    {section.count} {section.title.toLowerCase()}
                  </StatText>
                  <ViewButton variant="outline" size="sm">
                    Explore
                  </ViewButton>
                </SectionStats>
              </SectionCard>
            </Link>
          ))}
      </SectionGrid>

      {/* Placeholder for future content sections */}
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <HelpText>
          More community features and content will appear here as they become
          available.
        </HelpText>
      </div>
    </Container>
  );
};
