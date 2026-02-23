import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styled from "styled-components";

import { Button } from "@chardb/ui";
import {
  useGetCharacterQuery,
  LikeableType,
  CommentableType,
  ModerationStatus,
} from "../generated/graphql";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import { canUserEditCharacter } from "../lib/characterPermissions";
import { LikeButton } from "../components/LikeButton";
import { CommentList } from "../components/CommentList";
import { CharacterMediaGallery } from "../components/CharacterMediaGallery";
import { Tag } from "../components/Tag";
import { TagsContainer } from "../components/TagsContainer";

import { CharacterTraitsDisplay } from "../components/character/CharacterTraitsDisplay";
import { Markdown } from "../components/Markdown";

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
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

const CharacterHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.xl};
  margin-bottom: ${({ theme }) => theme.spacing.xl};

  @media (max-width: 768px) {
    flex-direction: column;
    gap: ${({ theme }) => theme.spacing.lg};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-left: auto;

  @media (max-width: 768px) {
    margin-left: 0;
    justify-content: flex-start;
  }
`;

const CharacterBasics = styled.div`
  flex: 1;
`;

const MainImageSection = styled.div`
  flex: 0 0 300px;

  @media (max-width: 768px) {
    flex: none;
    width: 100%;
  }
`;

const MainImageContainer = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const MainImageElement = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MainImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
`;

const CharacterTitle = styled.h1`
  font-size: 3rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const CharacterSpecies = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

const CharacterMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const MetaBadge = styled.span<{
  variant?: "default" | "success" | "warning" | "error";
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

const OwnerLink = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.lg};

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    transform: translateY(-2px);
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

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

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;


const TradingInfo = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const TradingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.sm};

  &:last-child {
    margin-bottom: 0;
  }
`;

const TradingLabel = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const TradingValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;

const Price = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.success};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`;

const CustomFieldsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-bottom: ${({ theme }) => theme.spacing.md};

  &:last-child {
    margin-bottom: 0;
  }
`;

const CustomFieldKey = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CustomFieldValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
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

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const InfoLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const InfoValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.primary};
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

const EmptySection = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

export const CharacterPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();


  const { data, loading, error } = useGetCharacterQuery({
    variables: { id: id! },
    skip: !id,
  });

  const character = data?.character;

  // Get user's permissions in the character's community
  const { permissions } = useUserCommunityRole(
    character?.species?.community?.id,
  );

  const handleBackClick = () => {
    navigate("/characters");
  };

  const handleEditClick = () => {
    navigate(`/character/${id}/edit`);
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

  if (error || !character) {
    return (
      <Container>
        <BackButton onClick={handleBackClick}>Back to Characters</BackButton>
        <ErrorContainer>
          <h3>Character not found</h3>
          <p>
            {error?.message ||
              "The character you are looking for does not exist or you do not have permission to view it."}
          </p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      {/* Breadcrumb navigation */}
      {character.species?.community ? (
        <Breadcrumb>
          <Link to={`/communities/${character.species.community.id}`}>
            {character.species.community.name}
          </Link>
          <span>/</span>
          <Link to={`/species/${character.species.id}`}>
            {character.species.name}
          </Link>
          <span>/</span>
          <span>{character.name}</span>
        </Breadcrumb>
      ) : (
        <Breadcrumb>
          <Link to="/characters">All Characters</Link>
          <span>/</span>
          <span>{character.name}</span>
        </Breadcrumb>
      )}

      <BackButton onClick={handleBackClick}>Back to Characters</BackButton>

      <CharacterHeader>
        <MainImageSection>
          <MainImageContainer>
            {character.mainMedia?.image ? (
              <MainImageElement
                src={
                  character.mainMedia.image.thumbnailUrl ||
                  character.mainMedia.image.originalUrl
                }
                alt={
                  character.mainMedia.image.altText ||
                  `${character.name} main image`
                }
              />
            ) : (
              <MainImagePlaceholder>
                No main image set for this character
              </MainImagePlaceholder>
            )}
          </MainImageContainer>
        </MainImageSection>

        <CharacterBasics>
          <CharacterTitle>{character.name}</CharacterTitle>
          {character.species?.name && (
            <CharacterSpecies>{character.species.name}</CharacterSpecies>
          )}

          <CharacterMeta>
            <MetaBadge variant={getVisibilityVariant(character.visibility)}>
              {character.visibility}
            </MetaBadge>
            {!character.owner && !character.pendingOwnership && (
              <MetaBadge variant="default">Community Character</MetaBadge>
            )}
            {character.pendingOwnership && (
              <MetaBadge variant="warning">
                Pending:{" "}
                {character.pendingOwnership.provider === "DISCORD"
                  ? "🎮"
                  : "🎨"}{" "}
                {character.pendingOwnership.providerAccountId}
              </MetaBadge>
            )}
            {character.isSellable && (
              <MetaBadge variant="success">For Sale</MetaBadge>
            )}
            {character.isTradeable && (
              <MetaBadge variant="warning">Open to Trades</MetaBadge>
            )}
            {character.traitReviewStatus === ModerationStatus.Pending && (
              <MetaBadge variant="warning">Traits Pending Review</MetaBadge>
            )}
            {character.traitReviewStatus === ModerationStatus.Rejected && (
              <MetaBadge variant="error">Traits Rejected</MetaBadge>
            )}
            <MetaBadge>Created {formatDate(character.createdAt)}</MetaBadge>
            <LikeButton
              entityType={LikeableType.Character}
              entityId={character.id}
              size="medium"
            />
          </CharacterMeta>

          <InfoGrid>
            {character._count && (
              <InfoItem>
                <InfoLabel>Media</InfoLabel>
                <InfoValue>{character._count.media}</InfoValue>
              </InfoItem>
            )}
          </InfoGrid>
        </CharacterBasics>

        {character.owner ? (
          <OwnerInfo>
            <OwnerLink to={`/user/${character.owner.username}`}>
              <OwnerAvatar>
                {character.owner.avatarImage ? (
                  <img
                    src={
                      character.owner.avatarImage.thumbnailUrl ||
                      character.owner.avatarImage.originalUrl
                    }
                    alt={
                      character.owner.avatarImage.altText ||
                      character.owner.displayName ||
                      character.owner.username
                    }
                  />
                ) : (
                  character.owner.displayName?.[0] ||
                  character.owner.username[0]
                )}
              </OwnerAvatar>
              <OwnerName>
                {character.owner.displayName || character.owner.username}
              </OwnerName>
              <OwnerRole>Character Owner</OwnerRole>
            </OwnerLink>
            {character.creator &&
              character.creator.id !== character.owner.id && (
                <>
                  <OwnerRole style={{ marginTop: "0.5rem" }}>
                    Created by{" "}
                    {character.creator.displayName ||
                      character.creator.username}
                  </OwnerRole>
                </>
              )}
          </OwnerInfo>
        ) : (
          <OwnerInfo>
            <OwnerRole>Community Character (No Owner)</OwnerRole>
            {character.creator && (
              <>
                <OwnerRole style={{ marginTop: "0.5rem" }}>
                  Created by{" "}
                  {character.creator.displayName || character.creator.username}
                </OwnerRole>
              </>
            )}
          </OwnerInfo>
        )}

        {canUserEditCharacter(character, user, permissions) && (
          <HeaderActions>
            <Button variant="primary" size="sm" onClick={handleEditClick}>
              Edit Character
            </Button>
          </HeaderActions>
        )}
      </CharacterHeader>

      {character._count && (
        <ImageStats>
          <ImageCount>{character._count.media}</ImageCount>
          <ImageLabel>Media in Gallery</ImageLabel>
        </ImageStats>
      )}

      {character.traitValues && character.traitValues.length > 0 && (
        <ContentSection>
          <SectionTitle>Character Traits</SectionTitle>
          <CharacterTraitsDisplay traitValues={character.traitValues} />
        </ContentSection>
      )}

      {character.details && (
        <ContentSection>
          <SectionTitle>Character Details</SectionTitle>
          <Markdown>{character.details}</Markdown>
        </ContentSection>
      )}

      {character.tags && character.tags.length > 0 ? (
        <ContentSection>
          <SectionTitle>Tags</SectionTitle>
          <TagsContainer>
            {character.tags.map((tag, index) => (
              <Tag key={index}>{tag}</Tag>
            ))}
          </TagsContainer>
        </ContentSection>
      ) : null}

      {(character.isSellable || character.isTradeable) && (
        <ContentSection>
          <SectionTitle>Trading Information</SectionTitle>
          <TradingInfo>
            <TradingRow>
              <TradingLabel>Available for Sale:</TradingLabel>
              <TradingValue>{character.isSellable ? "Yes" : "No"}</TradingValue>
            </TradingRow>
            <TradingRow>
              <TradingLabel>Open to Trades:</TradingLabel>
              <TradingValue>
                {character.isTradeable ? "Yes" : "No"}
              </TradingValue>
            </TradingRow>
            {character.price && character.isSellable && (
              <TradingRow>
                <TradingLabel>Price:</TradingLabel>
                <Price>${character.price.toFixed(2)}</Price>
              </TradingRow>
            )}
          </TradingInfo>
        </ContentSection>
      )}

      {character.customFields &&
        character.customFields !== "{}" &&
        (() => {
          try {
            const fields = JSON.parse(character.customFields);
            const fieldEntries = Object.entries(fields);
            if (fieldEntries.length === 0) return null;

            return (
              <ContentSection>
                <SectionTitle>Fields</SectionTitle>
                <TradingInfo>
                  {fieldEntries.map(([key, value]) => (
                    <CustomFieldsRow key={key}>
                      <CustomFieldKey>{key}</CustomFieldKey>
                      <CustomFieldValue>{String(value)}</CustomFieldValue>
                    </CustomFieldsRow>
                  ))}
                </TradingInfo>
              </ContentSection>
            );
          } catch {
            return null;
          }
        })()}

      {!character.details && (
        <EmptySection>
          <p>This character doesn't have any detailed information yet.</p>
        </EmptySection>
      )}

      <CharacterMediaGallery
        characterId={character.id}
        canUpload={canUserEditCharacter(character, user, permissions)}
        limit={8}
        currentMainMediaId={character.mainMediaId || undefined}
      />

      <CommentList
        entityType={CommentableType.Character}
        entityId={character.id}
      />

    </Container>
  );
};
