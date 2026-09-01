import React, { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import styled from "styled-components";

import { Avatar, Button } from "@chardb/ui";
import {
  useGetCharacterQuery,
  useGetMyEditKitsQuery,
  TraitReviewSource,
  useDeleteCharacterMutation,
  useKickCharacterFromSpeciesMutation,
  LikeableType,
  CommentableType,
  ModerationStatus,
} from "../generated/graphql";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import { canUserEditCharacter } from "../lib/characterPermissions";
import { setKinds } from "../lib/characterAvailability";
import { kitCovers } from "../lib/editKits";
import { CharacterAvailability } from "../generated/graphql";
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

const AdminActionsLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: ${({ theme }) => theme.spacing.xs};
  white-space: nowrap;
`;

const CharacterActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding-top: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
`;

const RemoveFromSpeciesButton = styled(Button)`
  color: ${({ theme }) => theme.colors.warning};
  border-color: ${({ theme }) => theme.colors.warning};
  background: transparent;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.warning};
    border-color: ${({ theme }) => theme.colors.warning};
    color: #fff;
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

const OwnerAvatar = styled(Avatar)`
  border: 3px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing.md};
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

/**
 * The trade button, below the rows rather than in one.
 *
 * A TradingRow is a label and its value. This is an action, and putting it in
 * the value column would make "Open to Trades: Yes" and the way to act on it
 * read as the same fact.
 */
const TradeAction = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.xs};
  margin-top: ${({ theme }) => theme.spacing.md};
  padding-top: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const TradeActionNote = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
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
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error } = useGetCharacterQuery({
    variables: { id: id! },
    skip: !id,
  });

  const character = data?.character;

  // Get user's permissions in the character's community
  const { permissions, userRole } = useUserCommunityRole(
    character?.species?.community?.id,
  );

  /**
   * How many edit kits this viewer holds that work on this character.
   *
   * Queried rather than assumed, so the offer below is only made when it can
   * be taken. Skipped for anyone who is not the owner, and for a character
   * that already has a change in the queue -- both are refusals, and neither
   * needs a round trip to discover.
   */
  const ownsCharacter = Boolean(user && character?.owner?.id === user.id);
  const hasPendingReview =
    character?.traitReviewStatus === ModerationStatus.Pending;

  const { data: kitsData } = useGetMyEditKitsQuery({
    variables: {
      communityId: character?.species?.communityId ?? "",
      userId: user?.id ?? "",
    },
    skip:
      !ownsCharacter ||
      hasPendingReview ||
      !character?.species?.communityId ||
      !user?.id,
  });

  /**
   * The item types this viewer holds that can edit this character.
   *
   * Names rather than a count, because the button should call the item what
   * the community called it. "Edit kit" is our word for the feature, not
   * anything a member has seen.
   */
  const eligibleKitTypes = useMemo(() => {
    if (!character) return [] as string[];
    return (kitsData?.memberHoldings?.holdings ?? [])
      .filter((h) => {
        const grant = h.itemType.useTraitEditGrant;
        return grant ? kitCovers(grant, character) : false;
      })
      .map((h) => h.itemType.name);
  }, [kitsData, character]);

  /**
   * Whether to offer this viewer a way to propose a trade for this character.
   *
   * Every clause is a way the offer would be a dead end, and a dead end here
   * is worse than nothing: the owner set `isTradeable` because people ask
   * regardless, so an affordance that cannot work still costs them the ask.
   * Which is also why a failure renders nothing rather than something
   * disabled -- a greyed-out button and a "trades are off" tooltip are both
   * still an invitation to try anyway.
   */
  /** Everything the owner has opened this character to, in list order. */
  const availability = character ? setKinds(character) : [];

  const tradeCommunityId = character?.species?.community?.id;
  const canProposeTrade = Boolean(
    character?.isTradeable &&
      user &&
      character.owner &&
      character.owner.id !== user.id &&
      // Characters reach a community through their species, and a trade is
      // scoped to one. No species, no community, nowhere to trade.
      tradeCommunityId &&
      // Both parties must be members, and this is the half we can see from
      // here. An owner who never joined is caught at send instead.
      userRole,
  );

  const [deleteCharacter, { loading: deleting }] = useDeleteCharacterMutation();
  const [kickFromSpecies, { loading: kicking }] =
    useKickCharacterFromSpeciesMutation();

  const handleBackClick = () => {
    navigate("/characters");
  };

  const handleEditClick = () => {
    navigate(`/character/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (
      !window.confirm(
        `Delete "${character?.name}"? This action soft-deletes the character and cannot be undone without admin intervention.`,
      )
    )
      return;
    setActionError(null);
    try {
      await deleteCharacter({ variables: { id } });
      navigate("/characters");
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Failed to delete character",
      );
    }
  };

  const handleKickFromSpecies = async () => {
    if (!id) return;
    if (
      !window.confirm(
        `Remove "${character?.name}" from its species? Trait values will be flattened to custom fields and the character will no longer be part of "${character?.species?.name}".`,
      )
    )
      return;
    setActionError(null);
    try {
      await kickFromSpecies({ variables: { id } });
      navigate(0); // reload page to reflect updated character state
    } catch (e) {
      setActionError(
        e instanceof Error
          ? e.message
          : "Failed to remove character from species",
      );
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
                {character.pendingOwnership.displayIdentifier ??
                  character.pendingOwnership.providerAccountId}
              </MetaBadge>
            )}
            {/* One badge per kind the owner has ticked, in a fixed order so
                two characters with the same settings read the same way. */}
            {availability.map((kind) => (
              <MetaBadge
                key={kind.field}
                variant={
                  kind.value === CharacterAvailability.TradeCharacters
                    ? "warning"
                    : "success"
                }
              >
                {kind.badge}
              </MetaBadge>
            ))}
            {/* Two different things wear this status.

                For every other source the traits on screen ARE the pending
                ones, applied when the character was made and awaiting
                ratification. A USER_EDIT review is the opposite: the traits
                shown are the approved ones and a *change* to them is waiting.
                One badge for both would tell a reader the design in front of
                them is provisional when it is settled. */}
            {character.traitReviewStatus === ModerationStatus.Pending &&
              (character.pendingTraitReviewSource ===
              TraitReviewSource.UserEdit ? (
                <MetaBadge variant="warning" data-testid="trait-edit-pending">
                  Trait Change Pending Review
                </MetaBadge>
              ) : (
                <MetaBadge variant="warning">Traits Pending Review</MetaBadge>
              ))}
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

          {/* An owner action, not a staff one, so it sits above the admin
              strip rather than inside it. Offered only when they actually
              hold a kit that works on this character -- a button whose every
              press is a refusal is the thing this codebase keeps not doing. */}
          {eligibleKitTypes.length > 0 && (
            <CharacterActions data-testid="character-edit-kit-actions">
              <AdminActionsLabel>Yours</AdminActionsLabel>
              <Button
                variant="outline"
                size="sm"
                data-testid="use-edit-kit"
                onClick={() =>
                  navigate(`/character/${character.id}/edit-traits`)
                }
              >
                {eligibleKitTypes.length === 1
                  ? `Use your ${eligibleKitTypes[0]}`
                  : "Change traits with an item"}
              </Button>
            </CharacterActions>
          )}

          {(canUserEditCharacter(character, user, permissions) ||
            permissions.canDeleteCharacter ||
            (user?.isAdmin ?? false)) && (
            <CharacterActions data-testid="character-admin-actions">
              <AdminActionsLabel>Admin</AdminActionsLabel>
              {canUserEditCharacter(character, user, permissions) && (
                <Button variant="outline" size="sm" onClick={handleEditClick}>
                  Edit Character
                </Button>
              )}
              {character.speciesId &&
                (permissions.canEditCharacterRegistry ||
                  (user?.isAdmin ?? false)) && (
                  <RemoveFromSpeciesButton
                    variant="outline"
                    size="sm"
                    onClick={handleKickFromSpecies}
                    disabled={kicking}
                  >
                    {kicking ? "Removing..." : "Remove from Species"}
                  </RemoveFromSpeciesButton>
                )}
              {(permissions.canDeleteCharacter || (user?.isAdmin ?? false)) && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Character"}
                </Button>
              )}
            </CharacterActions>
          )}
          {actionError && (
            <div
              style={{
                color: "red",
                marginTop: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              {actionError}
            </div>
          )}
        </CharacterBasics>

        {character.owner ? (
          <OwnerInfo>
            <OwnerLink to={`/user/${character.owner.username}`}>
              <OwnerAvatar
                image={character.owner.avatarImage}
                name={character.owner.displayName || character.owner.username}
                size={80}
              />
              <OwnerName data-testid="character-owner">
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
          <CharacterTraitsDisplay
            traitValues={character.traitValues}
            speciesId={character.speciesId}
            speciesVariantId={character.speciesVariantId}
          />
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

      {availability.length > 0 && (
        <ContentSection>
          <SectionTitle>Trading Information</SectionTitle>
          <TradingInfo>
            {/* Only what the owner said yes to. The old card listed every
                setting with a Yes or a No, which made a character open to
                nothing read as a list of refusals rather than a quiet page. */}
            {availability.map((kind) => (
              <TradingRow key={kind.field}>
                <TradingLabel>{kind.label}</TradingLabel>
                <TradingValue>Yes</TradingValue>
              </TradingRow>
            ))}
            {character.price && character.isSellable && (
              <TradingRow>
                <TradingLabel>Price:</TradingLabel>
                <Price>${character.price.toFixed(2)}</Price>
              </TradingRow>
            )}
            {canProposeTrade && (
              <TradeAction>
                <Button
                  variant="primary"
                  size="sm"
                  data-testid="propose-character-trade"
                  onClick={() =>
                    navigate(
                      `/communities/${tradeCommunityId}/trades/new?with=${character.owner?.id}&character=${character.id}`,
                    )
                  }
                >
                  Propose a Trade
                </Button>
                <TradeActionNote>
                  Opens an offer with {character.name} on their side. Nothing
                  moves until{" "}
                  {character.owner?.displayName ?? character.owner?.username}{" "}
                  accepts.
                </TradeActionNote>
              </TradeAction>
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
