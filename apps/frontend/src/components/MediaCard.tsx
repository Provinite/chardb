import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { MediaGridItem } from './MediaGrid';

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

const MediaSection = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const ImageElement = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const TextPreview = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(transparent, ${({ theme }) => theme.colors.surface});
  }
`;

const TextIcon = styled.div`
  font-size: 3rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PlaceholderContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

const Badge = styled.span`
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const TypeBadge = styled(Badge)<{ $isImage: boolean }>`
  background: ${props =>
    props.$isImage
      ? props.theme.colors.primary + '20'
      : props.theme.colors.secondary + '20'
  };
  color: ${props =>
    props.$isImage
      ? props.theme.colors.primary
      : props.theme.colors.secondary
  };
`;

const VisibilityBadge = styled.span<{ visibility: string }>`
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

const ActionButton = styled.button<{ variant?: 'primary' | 'danger' }>`
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props => 
    props.variant === 'danger' ? props.theme.colors.error :
    props.theme.colors.primary
  };
  color: white;
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionsOverlay = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1;
  
  ${Card}:hover & {
    opacity: 1;
  }
`;

const MainImageBadge = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  left: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  z-index: 1;
`;

interface MediaCardProps {
  /** The media item to display */
  media: MediaGridItem;
  /** Whether to show owner information in the card */
  showOwner?: boolean;
  /** Character ID if this is being displayed on a character page (enables Set as Main functionality) */
  characterId?: string;
  /** ID of the current main media for the character */
  currentMainMediaId?: string;
  /** Callback when Set as Main button is clicked */
  onSetAsMain?: (mediaId: string) => void;
  /** Callback when Remove as Main button is clicked */
  onRemoveAsMain?: () => void;
  /** Whether the Set as Main action is currently loading */
  isSettingMain?: boolean;
}

/**
 * A card component that displays either image or text media with metadata
 * Automatically adapts its layout based on the media type
 */
export const MediaCard: React.FC<MediaCardProps> = ({ 
  media, 
  showOwner = true,
  characterId,
  currentMainMediaId,
  onSetAsMain,
  onRemoveAsMain,
  isSettingMain = false
}) => {
  const navigate = useNavigate();
  const isImage = !!media.image;
  const isText = !!media.textContent;
  const isMainMedia = currentMainMediaId === media.id;
  const showSetAsMainActions = !!characterId && !!onSetAsMain;

  const renderMediaPreview = () => {
    if (isImage && media.image) {
      return (
        <ImageElement
          src={media.image.thumbnailUrl || media.image.originalUrl}
          alt={media.image.altText || media.title}
          loading="lazy"
        />
      );
    } else if (isText && media.textContent) {
      return (
        <TextPreview>
          {media.textContent.content}
        </TextPreview>
      );
    } else {
      return (
        <PlaceholderContent>
          <TextIcon>
            {isImage ? '🖼️' : '📝'}
          </TextIcon>
          <span>No content available</span>
        </PlaceholderContent>
      );
    }
  };

  const handleClick = () => {
    navigate(`/media/${media.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleSetAsMain = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onSetAsMain && !isSettingMain) {
      onSetAsMain(media.id);
    }
  };

  const handleRemoveAsMain = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onRemoveAsMain && !isSettingMain) {
      onRemoveAsMain();
    }
  };

  return (
    <Card
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View ${isImage ? 'image' : 'text'} ${media.title}`}
    >
      <MediaSection>
        {renderMediaPreview()}
        
        {/* Main Image Badge */}
        {isMainMedia && (
          <MainImageBadge>
            Main Image
          </MainImageBadge>
        )}
        
        {/* Set as Main Actions */}
        {showSetAsMainActions && (
          <ActionsOverlay>
            {isMainMedia ? (
              <ActionButton
                variant="danger"
                onClick={handleRemoveAsMain}
                disabled={isSettingMain}
                title="Remove as main image"
              >
                {isSettingMain ? '...' : 'Remove Main'}
              </ActionButton>
            ) : (
              <ActionButton
                onClick={handleSetAsMain}
                disabled={isSettingMain}
                title="Set as main image"
              >
                {isSettingMain ? '...' : 'Set as Main'}
              </ActionButton>
            )}
          </ActionsOverlay>
        )}
      </MediaSection>
      
      <Content>
        <Title>{media.title}</Title>
        {media.description && (
          <Description>{media.description}</Description>
        )}
        
        <Meta>
          {showOwner ? (
            <OwnerInfo>
              by {media.owner.displayName || media.owner.username}
            </OwnerInfo>
          ) : (
            <div />
          )}
          <MetaContainer>
            <TypeBadge $isImage={isImage}>
              {isImage ? 'image' : 'text'}
            </TypeBadge>
            {isText && media.textContent && (
              <Badge>{media.textContent.wordCount} words</Badge>
            )}
            <VisibilityBadge visibility={media.visibility}>
              {media.visibility}
            </VisibilityBadge>
          </MetaContainer>
        </Meta>
      </Content>
    </Card>
  );
};