import React from 'react';
import { useQuery } from '@apollo/client';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { GET_MY_GALLERIES } from '../graphql/galleries.graphql';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const GalleryCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
`;

const CardContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

const GalleryName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const GalleryDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const GalleryMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-wrap: wrap;
`;

const MetaBadge = styled.span<{
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
}>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${(props) => {
    switch (props.variant) {
      case 'success':
        return props.theme.colors.success + '20';
      case 'warning':
        return props.theme.colors.warning + '20';
      case 'error':
        return props.theme.colors.error + '20';
      case 'primary':
        return props.theme.colors.primary + '20';
      default:
        return props.theme.colors.background;
    }
  }};
  color: ${(props) => {
    switch (props.variant) {
      case 'success':
        return props.theme.colors.success;
      case 'warning':
        return props.theme.colors.warning;
      case 'error':
        return props.theme.colors.error;
      case 'primary':
        return props.theme.colors.primary;
      default:
        return props.theme.colors.text.secondary;
    }
  }};
`;

const ImageCount = styled.span`
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CharacterLink = styled(Link)`
  background: ${({ theme }) => theme.colors.primary + '20'};
  color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  text-decoration: none;
  transition: all 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.primary + '30'};
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const ViewButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
`;

const AddImageButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }
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

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const CreateButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.error};
`;

const getVisibilityVariant = (visibility: string) => {
  switch (visibility) {
    case 'PUBLIC':
      return 'success';
    case 'UNLISTED':
      return 'warning';
    case 'PRIVATE':
      return 'error';
    default:
      return 'default';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const MyGalleriesPage: React.FC = () => {
  const { user } = useAuth();

  const { data, loading, error } = useQuery(GET_MY_GALLERIES, {
    skip: !user,
  });

  const myGalleries = data?.myGalleries?.galleries || [];

  if (!user) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Please log in to view your galleries</h3>
        </ErrorContainer>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading your galleries</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Galleries</Title>
        <Subtitle>Image galleries you've created and own</Subtitle>
      </Header>

      {myGalleries.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🖼️</EmptyIcon>
          <EmptyTitle>No galleries yet</EmptyTitle>
          <EmptyDescription>
            You haven't created any galleries yet. Create your first gallery to
            organize your artwork!
          </EmptyDescription>
          <CreateButton to="/gallery/create">
            Create Your First Gallery
          </CreateButton>
        </EmptyState>
      ) : (
        <Grid>
          {myGalleries.map((gallery: any) => (
            <GalleryCard key={gallery.id}>
              <CardContent>
                <GalleryName>{gallery.name}</GalleryName>
                {gallery.description && (
                  <GalleryDescription>{gallery.description}</GalleryDescription>
                )}

                <GalleryMeta>
                  <MetaBadge variant={getVisibilityVariant(gallery.visibility)}>
                    {gallery.visibility}
                  </MetaBadge>
                  {gallery._count && (
                    <ImageCount>{gallery._count.images} images</ImageCount>
                  )}
                  {gallery.character && (
                    <CharacterLink to={`/character/${gallery.character.id}`}>
                      {gallery.character.name}
                    </CharacterLink>
                  )}
                  <MetaBadge>Created {formatDate(gallery.createdAt)}</MetaBadge>
                </GalleryMeta>

                <CardActions>
                  <ViewButton to={`/gallery/${gallery.id}`}>
                    View Gallery
                  </ViewButton>
                  <AddImageButton to={`/upload?galleryId=${gallery.id}`}>
                    Add Images
                  </AddImageButton>
                </CardActions>
              </CardContent>
            </GalleryCard>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default MyGalleriesPage;
