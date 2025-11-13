import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { Character } from '../generated/graphql';
import { Tag } from './Tag';
import { TagsContainer } from './TagsContainer';
import { CopyIdButton } from './CopyIdButton';

export type CharacterCardItem = Pick<Character,
  'id' | 'name' | 'visibility' | 'tags' | 'isSellable' | 'price'
> & {
  species?: Pick<NonNullable<Character['species']>, 'name'> | null;
  owner?: Pick<NonNullable<Character['owner']>, 'displayName' | 'username'> | null;
  mainMedia?: {
    image?: Pick<NonNullable<NonNullable<Character['mainMedia']>['image']>, 'thumbnailUrl' | 'originalUrl' | 'altText'> | null;
  } | null;
  _count?: Pick<NonNullable<Character['_count']>, 'media'> | null;
};

const Card = styled.div`
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

const ImageSection = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
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
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Name = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Species = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const Meta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const OwnerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const MetaContainer = styled.div`
  display: flex;
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
  shouldForwardProp: (prop) => prop !== 'visibility'
})<{ visibility: string }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${props => 
    props.visibility === 'PUBLIC' ? props.theme.colors.success + '20' :
    props.visibility === 'UNLISTED' ? props.theme.colors.warning + '20' : props.theme.colors.error + '20'
  };
  color: ${props => 
    props.visibility === 'PUBLIC' ? props.theme.colors.success :
    props.visibility === 'UNLISTED' ? props.theme.colors.warning : props.theme.colors.error
  };
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

const EditButton = styled(Link)`
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
  showEditButton = false
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/character/${character.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when button is clicked
  };

  return (
    <Card
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View character ${character.name}`}
    >
      <ButtonGroup>
        <CopyIdButton id={character.id} />
        {showEditButton && (
          <EditButton
            to={`/character/${character.id}/edit`}
            onClick={handleButtonClick}
          >
            Edit
          </EditButton>
        )}
      </ButtonGroup>
      <ImageSection>
        {character.mainMedia?.image ? (
          <MainImage
            src={character.mainMedia.image.thumbnailUrl || character.mainMedia.image.originalUrl}
            alt={character.mainMedia.image.altText || `${character.name} main image`}
          />
        ) : (
          <ImagePlaceholder>
            No main image
          </ImagePlaceholder>
        )}
      </ImageSection>
      
      <Content>
        <Name>{character.name}</Name>
        {character.species?.name && (
          <Species>
            {character.species.name}
          </Species>
        )}

        {character.tags && character.tags.length > 0 && (
          <TagsContainer size="sm" style={{ marginBottom: '0.75rem' }}>
            {character.tags.slice(0, 3).map((tag, index) => (
              <Tag key={index} size="sm">
                {tag}
              </Tag>
            ))}
            {character.tags.length > 3 && (
              <Tag size="sm" variant="primary">
                +{character.tags.length - 3}
              </Tag>
            )}
          </TagsContainer>
        )}
        
        <Meta>
          {showOwner ? (
            <OwnerInfo>
              {character.owner ? (
                <>by {character.owner.displayName || character.owner.username}</>
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