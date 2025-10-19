import React from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useGetUserProfileQuery } from '../generated/graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RandomCharacterButton } from '../components/RandomCharacterButton';
import { FollowButton } from '../components/FollowButton';
import { MediaGrid } from '../components/MediaGrid';
import { useQuery } from '@apollo/client';
import { MY_EXTERNAL_ACCOUNTS } from '../graphql/external-accounts.graphql';

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

const StatCard = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'clickable',
})<{ clickable?: boolean }>`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  text-align: center;
  cursor: ${({ clickable }) => (clickable ? 'pointer' : 'default')};
  transition: ${({ clickable }) =>
    clickable ? 'all 0.2s ease-in-out' : 'none'};

  ${({ clickable, theme }) =>
    clickable &&
    `
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: ${theme.colors.primary};
    }
  `}
`;

const StatLink = styled(Link)`
  color: inherit;
  text-decoration: none;
  display: block;
  width: 100%;
  height: 100%;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
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

const ProfileActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  align-self: flex-start;
`;

const EditButton = styled(Link)`
  padding: 0.5rem ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s ease;
  align-self: flex-start;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    opacity: 0.9;
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    align-self: stretch;
    text-align: center;
  }
`;

const ConnectedAccountsSection = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ConnectedAccountsTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const ConnectedAccountsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ConnectedAccountBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const AccountIcon = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary};
`;

export const UserProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();

  const { data, loading, error } = useGetUserProfileQuery({
    variables: { username: username! },
    skip: !username,
  });

  // Fetch external accounts only if viewing own profile
  const { data: externalAccountsData } = useQuery(MY_EXTERNAL_ACCOUNTS, {
    skip: !data?.userProfile?.isOwnProfile,
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

  const {
    user,
    stats,
    recentCharacters,
    recentGalleries,
    recentMedia,
    featuredCharacters,
    isOwnProfile,
  } = data.userProfile;

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
            {user.location && <MetaItem>📍 {user.location}</MetaItem>}
            {user.website && (
              <MetaItem>
                🔗{' '}
                <a
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {user.website}
                </a>
              </MetaItem>
            )}
            <MetaItem>
              📅 Joined {new Date(user.createdAt).toLocaleDateString()}
            </MetaItem>
          </ProfileMeta>
        </ProfileInfo>

        <ProfileActions>
          {isOwnProfile ? (
            <EditButton to="/profile/edit">Edit Profile</EditButton>
          ) : (
            <FollowButton userId={user.id} showCount={true} size="md" />
          )}
        </ProfileActions>
      </ProfileHeader>

      {/* Connected Accounts - Only shown when viewing own profile */}
      {isOwnProfile &&
        externalAccountsData?.myExternalAccounts &&
        externalAccountsData.myExternalAccounts.length > 0 && (
          <ConnectedAccountsSection>
            <ConnectedAccountsTitle>Connected Accounts</ConnectedAccountsTitle>
            <ConnectedAccountsList>
              {externalAccountsData.myExternalAccounts.map((account: any) => (
                <ConnectedAccountBadge key={account.id}>
                  <AccountIcon>
                    {account.provider === 'DEVIANTART'
                      ? 'DA'
                      : account.provider.charAt(0)}
                  </AccountIcon>
                  <span>{account.displayName}</span>
                </ConnectedAccountBadge>
              ))}
            </ConnectedAccountsList>
          </ConnectedAccountsSection>
        )}

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
        <StatCard clickable>
          <StatLink to={`/user/${user.username}/followers`}>
            <StatNumber>{stats.followersCount}</StatNumber>
            <StatLabel>Followers</StatLabel>
          </StatLink>
        </StatCard>
        <StatCard clickable>
          <StatLink to={`/user/${user.username}/following`}>
            <StatNumber>{stats.followingCount}</StatNumber>
            <StatLabel>Following</StatLabel>
          </StatLink>
        </StatCard>
      </StatsGrid>

      {featuredCharacters.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>Featured Characters</SectionTitle>
            <RandomCharacterButton characters={featuredCharacters} size="sm" />
          </SectionHeader>
          <Grid>
            {featuredCharacters.map((character) => (
              <Card key={character.id} to={`/character/${character.id}`}>
                <CardTitle>{character.name}</CardTitle>
                <CardDescription>{character.species?.name}</CardDescription>
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
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link
                to={`/characters?owner=${user.username}`}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                }}
              >
                View All ({stats.charactersCount})
              </Link>
              <RandomCharacterButton characters={recentCharacters} size="sm" />
            </div>
          </SectionHeader>
          <Grid>
            {recentCharacters.map((character) => (
              <Card key={character.id} to={`/character/${character.id}`}>
                <CardTitle>{character.name}</CardTitle>
                <CardDescription>{character.species?.name}</CardDescription>
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
          <SectionHeader>
            <SectionTitle>Recent Galleries</SectionTitle>
            <Link
              to={`/galleries?owner=${user.username}`}
              style={{
                color: 'inherit',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}
            >
              View All ({stats.galleriesCount})
            </Link>
          </SectionHeader>
          <Grid>
            {recentGalleries.map((gallery) => (
              <Card key={gallery.id} to={`/gallery/${gallery.id}`}>
                <CardTitle>{gallery.name}</CardTitle>
                {gallery.character && (
                  <CardDescription>
                    Character: {gallery.character.name}
                  </CardDescription>
                )}
                {gallery.description && (
                  <CardDescription>{gallery.description}</CardDescription>
                )}
              </Card>
            ))}
          </Grid>
        </Section>
      )}

      {recentMedia.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle>Recent Media</SectionTitle>
            <Link
              to={`/images?uploader=${user.username}`}
              style={{
                color: 'inherit',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: '500',
              }}
            >
              View All ({stats.imagesCount})
            </Link>
          </SectionHeader>
          <MediaGrid
            media={recentMedia as any[]}
            showOwner={false}
            emptyMessage="No media uploaded yet"
            emptyDescription="Upload some images or create text content to get started!"
          />
        </Section>
      )}
    </Container>
  );
};
