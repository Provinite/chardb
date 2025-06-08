import React from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useGetUserProfileQuery } from '../generated/graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RandomCharacterButton } from '../components/RandomCharacterButton';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ProfileHeader = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  align-items: start;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const Avatar = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid ${({ theme }) => theme.colors.border};
`;

const AvatarPlaceholder = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  color: white;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const Username = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const DisplayName = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const Bio = styled.p`
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const ProfileMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

const StatNumber = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.sm};
    align-items: stretch;
  }
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const SimpleSectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const Card = styled(Link)`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.md};
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const ImageCard = styled(Link)`
  display: block;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  aspect-ratio: 1;
  position: relative;
  text-decoration: none;

  &:hover img {
    transform: scale(1.05);
  }
`;

const CardImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
`;

const CardTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;

const CardDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};
`;

const VerifiedBadge = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`;

export const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  
  const { data, loading, error } = useGetUserProfileQuery({
    variables: { username: username! },
    skip: !username,
  });

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !data?.userProfile) {
    return (
      <Container>
        <ErrorContainer>
          <h2>User Not Found</h2>
          <p>The user "{username}" could not be found.</p>
        </ErrorContainer>
      </Container>
    );
  }

  const { user, stats, recentCharacters, recentGalleries, recentImages, featuredCharacters } = data.userProfile;

  return (
    <Container>
      <ProfileHeader>
        {user.avatarUrl ? (
          <Avatar src={user.avatarUrl} alt={`${user.username}'s avatar`} />
        ) : (
          <AvatarPlaceholder>
            {user.displayName?.[0] || user.username[0]}
          </AvatarPlaceholder>
        )}
        
        <ProfileInfo>
          <Username>
            @{user.username}
            {user.isVerified && <VerifiedBadge>✓</VerifiedBadge>}
          </Username>
          
          {user.displayName && <DisplayName>{user.displayName}</DisplayName>}
          
          {user.bio && <Bio>{user.bio}</Bio>}
          
          <ProfileMeta>
            {user.location && (
              <MetaItem>
                📍 {user.location}
              </MetaItem>
            )}
            {user.website && (
              <MetaItem>
                🔗 <a href={user.website} target="_blank" rel="noopener noreferrer">{user.website}</a>
              </MetaItem>
            )}
            <MetaItem>
              📅 Joined {new Date(user.createdAt).toLocaleDateString()}
            </MetaItem>
          </ProfileMeta>
        </ProfileInfo>
      </ProfileHeader>

      <StatsGrid>
        <StatCard>
          <StatNumber>{stats.charactersCount}</StatNumber>
          <StatLabel>Characters</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.galleriesCount}</StatNumber>
          <StatLabel>Galleries</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.imagesCount}</StatNumber>
          <StatLabel>Images</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.totalViews}</StatNumber>
          <StatLabel>Total Views</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.followersCount}</StatNumber>
          <StatLabel>Followers</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.followingCount}</StatNumber>
          <StatLabel>Following</StatLabel>
        </StatCard>
      </StatsGrid>

      {featuredCharacters.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>Featured Characters</SectionTitle>
            <RandomCharacterButton 
              characters={featuredCharacters} 
              size="sm"
            />
          </SectionHeader>
          <Grid>
            {featuredCharacters.map((character) => (
              <Card key={character.id} to={`/character/${character.id}`}>
                <CardTitle>{character.name}</CardTitle>
                <CardDescription>{character.species}</CardDescription>
                {character.description && (
                  <CardDescription>{character.description}</CardDescription>
                )}
              </Card>
            ))}
          </Grid>
        </Section>
      )}

      {recentCharacters.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>Recent Characters</SectionTitle>
            <RandomCharacterButton 
              characters={recentCharacters} 
              size="sm"
            />
          </SectionHeader>
          <Grid>
            {recentCharacters.map((character) => (
              <Card key={character.id} to={`/character/${character.id}`}>
                <CardTitle>{character.name}</CardTitle>
                <CardDescription>{character.species}</CardDescription>
                {character.description && (
                  <CardDescription>{character.description}</CardDescription>
                )}
              </Card>
            ))}
          </Grid>
        </Section>
      )}

      {recentGalleries.length > 0 && (
        <Section>
          <SimpleSectionTitle>Recent Galleries</SimpleSectionTitle>
          <Grid>
            {recentGalleries.map((gallery) => (
              <Card key={gallery.id} to={`/gallery/${gallery.id}`}>
                <CardTitle>{gallery.name}</CardTitle>
                {gallery.character && (
                  <CardDescription>Character: {gallery.character.name}</CardDescription>
                )}
                {gallery.description && (
                  <CardDescription>{gallery.description}</CardDescription>
                )}
              </Card>
            ))}
          </Grid>
        </Section>
      )}

      {recentImages.length > 0 && (
        <Section>
          <SimpleSectionTitle>Recent Images</SimpleSectionTitle>
          <ImageGrid>
            {recentImages.map((image) => (
              <ImageCard key={image.id} to={`/image/${image.id}`}>
                <CardImage
                  src={image.thumbnailUrl || image.url}
                  alt={image.description || 'Image'}
                />
              </ImageCard>
            ))}
          </ImageGrid>
        </Section>
      )}
    </Container>
  );
};