import React from "react";
import styled from "styled-components";
import { Character, Community } from "../generated/graphql";
import { characterUrl } from "../lib/communityHost";
import { HostAwareLink } from "./HostAwareLink";
import { Tag } from "./Tag";
import { TagsContainer } from "./TagsContainer";
import { CopyIdButton } from "./CopyIdButton";

export type CharacterCardItem = Pick<
  Character,
  "id" | "name" | "visibility" | "tags" | "isSellable" | "price"
> & {
  species?:
    | (Pick<NonNullable<Character["species"]>, "name"> & {
        /**
         * Which host the character is served from. Optional because a
         * character with no species has no community and therefore no host --
         * it lives at the apex, and `characterUrl` says so. Every list query
         * behind this card selects it.
         */
        community?: Pick<Community, "slug"> | null;
      })
    | null;
  owner?: Pick<
    NonNullable<Character["owner"]>,
    "displayName" | "username"
  > | null;
  mainMedia?: {
    image?: Pick<
      NonNullable<NonNullable<Character["mainMedia"]>["image"]>,
      "thumbnailUrl" | "originalUrl" | "altText"
    > | null;
  } | null;
  _count?: Pick<NonNullable<Character["_count"]>, "media"> | null;
};

/**
 * The card renders at the apex (My Characters, Liked, a profile, the feed) and
 * on a community host (the roster), and the character it names lives on
 * whichever host its species' community owns -- so the destination is absolute
 * and may or may not be this origin. `HostAwareLink` decides per click: a
 * roster linking to its own community stays client-side, and only a link that
 * genuinely crosses costs a page load.
 */
/**
 * Every card is this tall, and its icon is this square (#420).
 *
 * The icon is the main image's thumbnail, which is square and framed by
 * whoever uploaded it; a box of any other shape trims that framing again. A
 * fixed height is what keeps the box square whatever the text beside it holds,
 * so the text is held to one line per row rather than allowed to grow the
 * card.
 */
const CARD_HEIGHT = "160px";

/** Two fit beside the icon with room for the "+N" count; three did not. */
const VISIBLE_TAGS = 2;

const Card = styled(HostAwareLink)`
  display: flex;
  height: ${CARD_HEIGHT};
  text-decoration: none;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  transition: all 0.2s;
  cursor: pointer;
  overflow: hidden;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/** Square off the card's inner height, which its border makes a little short. */
const ImageSection = styled.div`
  flex: none;
  height: 100%;
  aspect-ratio: 1 / 1;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const MainImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImagePlaceholder = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ theme }) => theme.spacing.md};
`;

/** One line, cut with an ellipsis: see `CARD_HEIGHT`. */
const oneLine = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Name = styled.h3`
  ${oneLine}
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Species = styled.p`
  ${oneLine}
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

/** Tags past the card's width are cut rather than wrapped onto a new row. */
const TagRow = styled.div`
  overflow: hidden;

  & > * {
    flex-wrap: nowrap;
  }
`;

const Meta = styled.div`
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OwnerInfo = styled.div`
  ${oneLine}
  min-width: 0;
`;

const MetaContainer = styled.div`
  display: flex;
  flex-shrink: 0;
  gap: ${({ theme }) => theme.spacing.sm};
  align-items: center;
`;

const ImageCount = styled.span`
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const VisibilityBadge = styled.span.withConfig({
  shouldForwardProp: (prop) => prop !== "visibility",
})<{ visibility: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${(props) =>
    props.visibility === "PUBLIC"
      ? props.theme.colors.success + "20"
      : props.visibility === "UNLISTED"
        ? props.theme.colors.warning + "20"
        : props.theme.colors.error + "20"};
  color: ${(props) =>
    props.visibility === "PUBLIC"
      ? props.theme.colors.success
      : props.visibility === "UNLISTED"
        ? props.theme.colors.warning
        : props.theme.colors.error};
`;

const ButtonGroup = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  opacity: 0;
  transition: all 0.2s ease-in-out;
  z-index: 10;

  ${Card}:hover & {
    opacity: 1;
  }
`;

/** Same treatment as `Card`, for the same reason. */
const EditButton = styled(HostAwareLink)`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

interface CharacterCardProps {
  character: CharacterCardItem;
  showOwner?: boolean;
  showEditButton?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  showOwner = true,
  showEditButton = false,
}) => {
  const href = characterUrl(character.id, character.species?.community?.slug);

  return (
    <Card
      to={href}
      aria-label={`View character ${character.name}`}
      data-testid="character-card"
      data-character-id={character.id}
    >
      <ButtonGroup>
        <CopyIdButton id={character.id} />
        {showEditButton && <EditButton to={`${href}/edit`}>Edit</EditButton>}
      </ButtonGroup>
      <ImageSection data-testid="character-card-icon">
        {character.mainMedia?.image ? (
          <MainImage
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
          <ImagePlaceholder>No main image</ImagePlaceholder>
        )}
      </ImageSection>

      <Content>
        <Name title={character.name}>{character.name}</Name>
        {character.species?.name && <Species>{character.species.name}</Species>}

        {character.tags && character.tags.length > 0 && (
          <TagRow>
            <TagsContainer size="sm">
              {character.tags.slice(0, VISIBLE_TAGS).map((tag, index) => (
                <Tag key={index} size="sm">
                  {tag}
                </Tag>
              ))}
              {character.tags.length > VISIBLE_TAGS && (
                <Tag size="sm" variant="primary">
                  +{character.tags.length - VISIBLE_TAGS}
                </Tag>
              )}
            </TagsContainer>
          </TagRow>
        )}

        <Meta>
          {showOwner ? (
            <OwnerInfo>
              {character.owner ? (
                <>
                  by {character.owner.displayName || character.owner.username}
                </>
              ) : (
                <>Community Character</>
              )}
            </OwnerInfo>
          ) : (
            <div />
          )}
          <MetaContainer>
            {character._count && (
              <ImageCount>{character._count.media} media</ImageCount>
            )}
            {character.isSellable && character.price && (
              <ImageCount>${character.price}</ImageCount>
            )}
            <VisibilityBadge visibility={character.visibility}>
              {character.visibility}
            </VisibilityBadge>
          </MetaContainer>
        </Meta>
      </Content>
    </Card>
  );
};
