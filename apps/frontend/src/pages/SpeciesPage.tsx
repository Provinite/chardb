import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  Database,
  Settings,
  Users,
  ArrowLeft,
  Palette,
  Layers,
} from 'lucide-react';
import {
  Button,
  Title,
  Heading2,
  Heading3,
  SmallText,
  HelpText,
  Card,
} from '@chardb/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  useSpeciesByIdQuery,
  useTraitsBySpeciesQuery,
  useSpeciesVariantsBySpeciesQuery,
  useGetCharactersQuery,
} from '../generated/graphql';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Species Landing Page
 *
 * Public landing page for a specific species showing overview information,
 * traits, variants, and related characters.
 *
 * Features:
 * - Species overview and metadata
 * - Navigation to species management tools (for admins)
 * - Display of traits and variants
 * - Character count and examples
 * - Community context
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackButton = styled(Button)`
  margin-bottom: 1.5rem;
`;

const Header = styled.div`
  margin-bottom: 3rem;
`;

const SpeciesHeader = styled.div`
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

const SpeciesIcon = styled.div`
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

const SpeciesInfo = styled.div`
  flex: 1;
`;

const SpeciesName = styled(Title)`
  margin: 0 0 0.5rem 0;
`;

const SpeciesMeta = styled.div`
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

const CommunityLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
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

  ${(props) =>
    props.onClick &&
    `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
  `}
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

const StatusBadge = styled.div<{ $available?: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme, $available }) =>
    $available ? theme.colors.success + '20' : theme.colors.text.muted + '20'};
  color: ${({ theme, $available }) =>
    $available ? theme.colors.success : theme.colors.text.muted};
`;

export const SpeciesPage: React.FC = () => {
  const { speciesId } = useParams<{ speciesId: string }>();
  const { user } = useAuth();

  const { data, loading, error } = useSpeciesByIdQuery({
    variables: { id: speciesId! },
    skip: !speciesId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  // Fetch trait count for this species
  const { data: traitsData } = useTraitsBySpeciesQuery({
    variables: { speciesId: speciesId!, first: 1 }, // Just get count
    skip: !speciesId,
  });

  // Fetch variant count for this species
  const { data: variantsData } = useSpeciesVariantsBySpeciesQuery({
    variables: { speciesId: speciesId!, first: 1 }, // Just get count
    skip: !speciesId,
  });

  // Fetch character count for this species
  const { data: charactersData } = useGetCharactersQuery({
    variables: {
      filters: {
        speciesId: speciesId,
        limit: 1, // Just get count
        offset: 0,
      },
    },
    skip: !speciesId,
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
          <Heading2>Error Loading Species</Heading2>
          <HelpText>
            Unable to load species information. Please try refreshing the page.
          </HelpText>
        </ErrorContainer>
      </Container>
    );
  }

  if (!data?.speciesById) {
    return (
      <Container>
        <NotFoundContainer>
          <Heading2>Species Not Found</Heading2>
          <HelpText>
            The species you're looking for doesn't exist or may have been
            removed.
          </HelpText>
        </NotFoundContainer>
      </Container>
    );
  }

  const species = data.speciesById;

  // Get actual counts from GraphQL queries
  const traitsCount = traitsData?.traitsBySpecies?.totalCount || 0;
  const variantsCount = variantsData?.speciesVariantsBySpecies?.totalCount || 0;
  const charactersCount = charactersData?.characters?.total || 0;

  const sections = [
    {
      id: 'traits',
      title: 'Traits',
      description:
        "Configure and manage traits that define this species' characteristics",
      icon: Database,
      path: `/species/${speciesId}/traits`,
      count: traitsCount,
      adminOnly: true,
      available: true,
    },
    {
      id: 'variants',
      title: 'Variants',
      description:
        'Manage different variants and their specific trait configurations',
      icon: Layers,
      path: `/species/${speciesId}/variants`,
      count: variantsCount,
      adminOnly: true,
      available: true,
    },
    {
      id: 'characters',
      title: 'Characters',
      description: 'Browse characters created using this species',
      icon: Users,
      path: `/characters?species=${species.name}`,
      count: charactersCount,
      adminOnly: false,
      available: charactersCount > 0, // Enable when there are characters to show
    },
  ];

  const availableSections = sections.filter(
    (section) => !section.adminOnly || (user && section.adminOnly),
  );

  return (
    <Container>
      <BackButton
        variant="outline"
        icon={<ArrowLeft size={16} />}
        onClick={() => window.history.back()}
      >
        Back
      </BackButton>

      <Header>
        <SpeciesHeader>
          <SpeciesIcon>
            {species.hasImage ? <Palette size={32} /> : <Database size={32} />}
          </SpeciesIcon>

          <SpeciesInfo>
            <SpeciesName>{species.name}</SpeciesName>
            <SpeciesMeta>
              <MetaItem>
                <Database size={16} />
                <span>
                  Created {new Date(species.createdAt).toLocaleDateString()}
                </span>
              </MetaItem>
              {species.community && (
                <MetaItem>
                  <Users size={16} />
                  <CommunityLink to={`/communities/${species.communityId}`}>
                    {species.community.name}
                  </CommunityLink>
                </MetaItem>
              )}
              <MetaItem>
                {species.hasImage ? (
                  <StatusBadge $available={true}>Has Image</StatusBadge>
                ) : (
                  <StatusBadge $available={false}>No Image</StatusBadge>
                )}
              </MetaItem>
            </SpeciesMeta>

            {user && (
              <ActionButtons>
                <Button
                  variant="primary"
                  icon={<Settings size={16} />}
                  as={Link}
                  to={`/communities/${species.communityId}/species`}
                >
                  Manage Species
                </Button>
              </ActionButtons>
            )}
          </SpeciesInfo>
        </SpeciesHeader>
      </Header>

      {availableSections.length > 0 ? (
        <SectionGrid>
          {availableSections.map((section) => {
            const CardComponent = section.available
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ({ children, ...props }: any) => (
                  <Link
                    to={section.path}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <SectionCard {...props}>{children}</SectionCard>
                  </Link>
                )
              : SectionCard;

            return (
              <CardComponent key={section.id}>
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
                  {section.available ? (
                    <ViewButton variant="outline" size="sm">
                      {section.adminOnly ? 'Manage' : 'View'}
                    </ViewButton>
                  ) : (
                    <StatusBadge $available={false}>
                      {section.id === 'characters'
                        ? section.count === 0
                          ? 'No Characters Yet'
                          : 'Coming Soon'
                        : 'Coming Soon'}
                    </StatusBadge>
                  )}
                </SectionStats>
              </CardComponent>
            );
          })}
        </SectionGrid>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <HelpText>
            Sign in to access species management tools and character creation
            features.
          </HelpText>
          <div style={{ marginTop: '1rem' }}>
            <Button variant="primary" as={Link} to="/login">
              Sign In
            </Button>
          </div>
        </div>
      )}

      {/* Placeholder for future content */}
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <HelpText>
          Additional species information and community content will appear here
          as features are developed.
        </HelpText>
      </div>
    </Container>
  );
};
