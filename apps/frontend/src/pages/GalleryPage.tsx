import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client";
import styled from "styled-components";
import { GET_GALLERY, Gallery } from "../graphql/galleries.graphql";
import { GET_MEDIA } from "../graphql/media.graphql";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LikeButton } from "../components/LikeButton";
import { CommentList } from "../components/CommentList";
import { MediaCard } from "../components/MediaCard";
import { LikeableType, CommentableType, Media } from "../generated/graphql";

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
    content: "←";
    font-weight: bold;
  }
`;

const GalleryHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const GalleryBasics = styled.div`
  flex: 1;
`;

const GalleryTitle = styled.h1`
  font-size: 3rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const GalleryMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const MetaBadge = styled.span<{
  variant?: "default" | "success" | "warning" | "error" | "primary";
}>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${(props) => {
    switch (props.variant) {
      case "success":
        return props.theme.colors.success + "20";
      case "warning":
        return props.theme.colors.warning + "20";
      case "error":
        return props.theme.colors.error + "20";
      case "primary":
        return props.theme.colors.primary + "20";
      default:
        return props.theme.colors.surface;
    }
  }};
  color: ${(props) => {
    switch (props.variant) {
      case "success":
        return props.theme.colors.success;
      case "warning":
        return props.theme.colors.warning;
      case "error":
        return props.theme.colors.error;
      case "primary":
        return props.theme.colors.primary;
      default:
        return props.theme.colors.text.secondary;
    }
  }};
`;

const OwnerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 200px;

  @media (max-width: 768px) {
    align-items: flex-start;
    text-align: left;
  }
`;

const OwnerAvatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  border: 3px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OwnerName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
`;

const OwnerRole = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const ContentSection = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const ContentText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: pre-wrap;
`;

const Lightbox = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isOpen",
})<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: ${(props) => (props.isOpen ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const LightboxImage = styled.img`
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
`;

const LightboxClose = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.lg};
  right: ${({ theme }) => theme.spacing.lg};
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 2rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const CharacterLink = styled.button`
  background: ${({ theme }) => theme.colors.primary + "20"};
  color: ${({ theme }) => theme.colors.primary};
  border: 2px solid ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: white;
  }
`;

const ImageStats = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ImageCount = styled.div`
  font-size: 2rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const ImageLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
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

const EmptyImagesState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.muted};

  h4 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const MediaLoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const GalleryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_GALLERY, {
    variables: { id: id! },
    skip: !id,
  });

  const {
    data: mediaData,
    loading: mediaLoading,
    error: mediaError,
  } = useQuery(GET_MEDIA, {
    variables: { filters: { galleryId: id } },
    skip: !id,
  });

  const gallery: Gallery | undefined = data?.gallery;
  const mediaItems = mediaData?.media?.media || [];

  const handleBackClick = () => {
    navigate("/galleries");
  };

  const handleCharacterClick = () => {
    if (gallery?.character) {
      navigate(`/character/${gallery.character.id}`);
    }
  };

  const getVisibilityVariant = (visibility: string) => {
    switch (visibility) {
      case "PUBLIC":
        return "success";
      case "UNLISTED":
        return "warning";
      case "PRIVATE":
        return "error";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  if (error || !gallery) {
    return (
      <Container>
        <BackButton onClick={handleBackClick}>Back to Galleries</BackButton>
        <ErrorContainer>
          <h3>Gallery not found</h3>
          <p>
            {error?.message ||
              "The gallery you are looking for does not exist or you do not have permission to view it."}
          </p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <BackButton onClick={handleBackClick}>Back to Galleries</BackButton>

        <GalleryHeader>
          <GalleryBasics>
            <GalleryTitle>{gallery.name}</GalleryTitle>

            <GalleryMeta>
              <MetaBadge variant={getVisibilityVariant(gallery.visibility)}>
                {gallery.visibility}
              </MetaBadge>
              {gallery.character && (
                <CharacterLink onClick={handleCharacterClick}>
                  {gallery.character.name}
                </CharacterLink>
              )}
              <MetaBadge>Created {formatDate(gallery.createdAt)}</MetaBadge>
              <LikeButton
                entityType={LikeableType.Gallery}
                entityId={gallery.id}
                size="medium"
              />
            </GalleryMeta>
          </GalleryBasics>

          <OwnerInfo>
            <OwnerAvatar>
              {gallery.owner.avatarUrl ? (
                <img
                  src={gallery.owner.avatarUrl}
                  alt={gallery.owner.displayName || gallery.owner.username}
                />
              ) : (
                gallery.owner.displayName?.[0] || gallery.owner.username[0]
              )}
            </OwnerAvatar>
            <OwnerName>
              {gallery.owner.displayName || gallery.owner.username}
            </OwnerName>
            <OwnerRole>Gallery Owner</OwnerRole>
          </OwnerInfo>
        </GalleryHeader>

        {gallery._count && (
          <ImageStats>
            <ImageCount>{gallery._count.media}</ImageCount>
            <ImageLabel>Media in Gallery</ImageLabel>
          </ImageStats>
        )}

        {gallery.description && (
          <ContentSection>
            <SectionTitle>Description</SectionTitle>
            <ContentText>{gallery.description}</ContentText>
          </ContentSection>
        )}

        <ContentSection>
          <SectionHeader>
            <SectionTitle>Gallery Content</SectionTitle>
          </SectionHeader>
          {mediaLoading && (
            <MediaLoadingContainer>
              <LoadingSpinner />
              <span style={{ marginLeft: "12px" }}>
                Loading gallery content...
              </span>
            </MediaLoadingContainer>
          )}
          {mediaError && (
            <EmptyImagesState>
              <h4>Error loading gallery content</h4>
              <p>
                There was an error loading the media content for this gallery.
                Please try refreshing the page.
              </p>
            </EmptyImagesState>
          )}
          {!mediaLoading && !mediaError && mediaItems.length === 0 && (
            <EmptyImagesState>
              <h4>No media yet</h4>
              <p>
                This gallery doesn't have any media content yet. Upload some
                images or create text content and assign it to this gallery to
                get started!
              </p>
            </EmptyImagesState>
          )}
          {!mediaLoading && !mediaError && mediaItems.length > 0 && (
            <MediaGrid>
              {mediaItems.map((mediaItem: Media) => (
                <MediaCard
                  key={mediaItem.id}
                  media={mediaItem}
                  showOwner={true}
                />
              ))}
            </MediaGrid>
          )}
        </ContentSection>

        <CommentList
          entityType={CommentableType.Gallery}
          entityId={gallery.id}
        />
      </Container>

      <Lightbox isOpen={!!lightboxImage} onClick={() => setLightboxImage(null)}>
        <LightboxClose onClick={() => setLightboxImage(null)}>×</LightboxClose>
        {lightboxImage && (
          <LightboxImage
            src={lightboxImage}
            alt="Gallery image"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </Lightbox>
    </>
  );
};
