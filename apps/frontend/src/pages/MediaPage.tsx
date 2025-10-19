import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import styled from 'styled-components';
import { toast } from 'react-hot-toast';
import { Button } from '@chardb/ui';
import {
  GET_MEDIA_ITEM,
  useDeleteMediaMutation,
} from '../graphql/media.graphql';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';
// import { LikeButton } from '../components/LikeButton';
// import { CommentList } from '../components/CommentList';
import { TextViewer } from '../components/TextViewer';
// import { LikeableType, CommentableType } from '../generated/graphql';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &::before {
    content: '←';
    font-weight: bold;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const MetaBadge = styled.span<{
  variant?: 'default' | 'success' | 'warning' | 'error';
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
      default:
        return props.theme.colors.surface;
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
      default:
        return props.theme.colors.text.secondary;
    }
  }};
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const AuthorLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const AuthorAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background};
  border: 2px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const AuthorDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const AuthorName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const AuthorRole = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const ContentSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ImageContainer = styled.div`
  position: relative;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const ImageElement = styled.img`
  max-width: 100%;
  max-height: 80vh;
  height: auto;
  width: auto;
  display: block;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const ImageOverlay = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: ${({ isOpen }) => (isOpen ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;

  img {
    max-width: 95vw;
    max-height: 95vh;
    object-fit: contain;
  }
`;

const ImageMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.sm};
  flex-wrap: wrap;
`;

const ImageMetaBadge = styled.span`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.error};

  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const CharacterInfo = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const CharacterLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  text-decoration: none;
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

export const MediaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data, loading, error } = useQuery(GET_MEDIA_ITEM, {
    variables: { id: id! },
    skip: !id,
  });

  const [deleteMedia, { loading: deleteLoading }] = useDeleteMediaMutation({
    onCompleted: () => {
      toast.success(`Media "${media?.title}" has been deleted successfully`);
      // Navigate back to the appropriate page
      if (media?.characterId) {
        navigate(`/character/${media.characterId}`);
      } else if (media?.galleryId) {
        navigate(`/gallery/${media.galleryId}`);
      } else {
        navigate('/');
      }
    },
    onError: (error) => {
      console.error('Failed to delete media:', error);
      toast.error(`Failed to delete media: ${error.message}`);
    },
    update: (cache) => {
      // Remove the media from cache
      cache.evict({ id: cache.identify({ __typename: 'Media', id }) });
      cache.gc();
    },
  });

  const media = data?.mediaItem;

  const handleBackClick = () => {
    if (media?.characterId) {
      navigate(`/character/${media.characterId}`);
    } else if (media?.galleryId) {
      navigate(`/gallery/${media.galleryId}`);
    } else {
      navigate('/');
    }
  };

  const handleEditClick = () => {
    navigate(`/media/${id}/edit`);
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (id) {
      deleteMedia({ variables: { id } });
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || !media) {
    return (
      <Container>
        <BackButton onClick={handleBackClick}>Back</BackButton>
        <ErrorContainer>
          <h3>Content not found</h3>
          <p>
            {error?.message ||
              'The content you are looking for does not exist or you do not have permission to view it.'}
          </p>
        </ErrorContainer>
      </Container>
    );
  }

  const isTextMedia = media.textContentId && media.textContent;
  const isImageMedia = media.imageId && media.image;

  // Ensure we have valid content
  if (!isTextMedia && !isImageMedia) {
    return (
      <Container>
        <BackButton onClick={handleBackClick}>Back</BackButton>
        <ErrorContainer>
          <h3>No content found</h3>
          <p>This media item doesn't contain any viewable content.</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton onClick={handleBackClick}>
        {media.characterId
          ? 'Back to Character'
          : media.galleryId
            ? 'Back to Gallery'
            : 'Back'}
      </BackButton>

      <Header>
        <HeaderContent>
          <Title>{media.title}</Title>
          {media.description && <Description>{media.description}</Description>}

          <Meta>
            <MetaBadge variant={getVisibilityVariant(media.visibility)}>
              {media.visibility}
            </MetaBadge>
            {isTextMedia && (
              <>
                <MetaBadge>{media.textContent.wordCount} words</MetaBadge>
                <MetaBadge>
                  {media.textContent.formatting.toLowerCase()}
                </MetaBadge>
              </>
            )}
            {isImageMedia && (
              <>
                <MetaBadge>
                  {media.image.width} × {media.image.height}px
                </MetaBadge>
                <MetaBadge>{formatFileSize(media.image.fileSize)}</MetaBadge>
                {media.image.isNsfw && (
                  <MetaBadge variant="error">NSFW</MetaBadge>
                )}
              </>
            )}
            <MetaBadge>Created {formatDate(media.createdAt)}</MetaBadge>
          </Meta>
        </HeaderContent>

        {user && user.id === media.ownerId && (
          <HeaderActions>
            <Button variant="primary" size="sm" onClick={handleEditClick}>
              Edit Content
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDeleteClick}>
              Delete
            </Button>
          </HeaderActions>
        )}
      </Header>

      {media.character && (
        <CharacterInfo>
          <CharacterLink to={`/character/${media.character.id}`}>
            📖 {media.character.name}
          </CharacterLink>
        </CharacterInfo>
      )}

      <AuthorInfo>
        <AuthorLink to={`/user/${media.owner.username}`}>
          <AuthorAvatar>
            {media.owner.avatarUrl ? (
              <img
                src={media.owner.avatarUrl}
                alt={media.owner.displayName || media.owner.username}
              />
            ) : (
              media.owner.displayName?.[0] || media.owner.username[0]
            )}
          </AuthorAvatar>
          <AuthorDetails>
            <AuthorName>
              {media.owner.displayName || media.owner.username}
            </AuthorName>
            <AuthorRole>Author</AuthorRole>
          </AuthorDetails>
        </AuthorLink>
      </AuthorInfo>

      <ContentSection>
        {isImageMedia && (
          <>
            <ImageContainer>
              <ImageElement
                src={media.image.url}
                alt={media.image.altText || media.title}
                onClick={() => setLightboxOpen(true)}
              />
            </ImageContainer>
            {media.image.altText && (
              <ImageMeta>
                <ImageMetaBadge>Alt text: {media.image.altText}</ImageMetaBadge>
              </ImageMeta>
            )}
            {media.image.artistName && (
              <ImageMeta>
                <ImageMetaBadge>
                  Artist: {media.image.artistName}
                </ImageMetaBadge>
                {media.image.source && (
                  <ImageMetaBadge>Source: {media.image.source}</ImageMetaBadge>
                )}
              </ImageMeta>
            )}
          </>
        )}
        {isTextMedia && (
          <TextViewer
            textContent={media.textContent}
            maxHeight="none"
            showWordCount={false}
            allowFormatToggle={true}
          />
        )}
      </ContentSection>

      {/* TODO: Add comments when MEDIA is added to CommentableType enum */}
      {/* <CommentList
        entityType={CommentableType.Media}
        entityId={media.id}
      /> */}

      {isImageMedia && (
        <ImageOverlay
          isOpen={lightboxOpen}
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={media.image.url}
            alt={media.image.altText || media.title}
            onClick={(e) => e.stopPropagation()}
          />
        </ImageOverlay>
      )}

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Media"
        message="Are you sure you want to delete this media? This action cannot be undone and will permanently remove the content."
        itemName={media?.title}
        isLoading={deleteLoading}
      />
    </Container>
  );
};
