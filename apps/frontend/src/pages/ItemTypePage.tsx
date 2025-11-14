import React from "react";
import { useParams, Link } from "react-router-dom";
import styled from "styled-components";
import { Package, ArrowLeft, Users, Calendar } from "lucide-react";
import { Button, Title, Heading2, SmallText, HelpText } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ColorPip } from "../components/colors";
import { useGetItemTypeQuery } from "../generated/graphql";

/**
 * Item Type Detail Page
 *
 * Public landing page for a specific item type showing overview information,
 * properties, and community context.
 *
 * Features:
 * - Item type overview and metadata
 * - Display of item properties (stackable, tradeable, consumable)
 * - Community context and navigation
 * - Image display with fallback to icon
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const BackButton = styled(Button)`
  margin-bottom: 1.5rem;
`;

const Header = styled.div`
  margin-bottom: 3rem;
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
  }
`;

const ItemIconContainer = styled.div<{ $colorHex?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  border-radius: 20px;
  background: ${({ theme, $colorHex }) =>
    $colorHex ? `${$colorHex}30` : `${theme.colors.primary}20`};
  color: ${({ theme, $colorHex }) => $colorHex || theme.colors.primary};
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
`;

const ItemImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 20px;
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemName = styled(Title)`
  margin: 0 0 0.5rem 0;
`;

const ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
`;

const CommunityLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const PropertiesSection = styled.div`
  margin-bottom: 2rem;
`;

const PropertiesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const PropertyBadge = styled.div<{ $variant?: 'default' | 'success' | 'info' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  background: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'success':
        return theme.colors.success + '20';
      case 'info':
        return theme.colors.primary + '20';
      default:
        return theme.colors.text.muted + '20';
    }
  }};
  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'success':
        return theme.colors.success;
      case 'info':
        return theme.colors.primary;
      default:
        return theme.colors.text.muted;
    }
  }};
`;

const CategoryBadge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.primary}20;
  color: ${({ theme }) => theme.colors.primary};
`;

const ColorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DescriptionSection = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
`;

const DescriptionText = styled.p`
  margin: 0;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.colors.error};
`;

const NotFoundContainer = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const ItemTypePage: React.FC = () => {
  const { itemTypeId } = useParams<{ itemTypeId: string }>();

  const { data, loading, error } = useGetItemTypeQuery({
    variables: { id: itemTypeId! },
    skip: !itemTypeId,
    fetchPolicy: "cache-and-network",
    errorPolicy: "all"
  });

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner size="lg" />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorContainer>
          <Heading2>Error Loading Item</Heading2>
          <HelpText>
            Unable to load item information. Please try refreshing the page.
          </HelpText>
        </ErrorContainer>
      </Container>
    );
  }

  if (!data?.itemType) {
    return (
      <Container>
        <NotFoundContainer>
          <Heading2>Item Not Found</Heading2>
          <HelpText>
            The item you're looking for doesn't exist or may have been removed.
          </HelpText>
        </NotFoundContainer>
      </Container>
    );
  }

  const itemType = data.itemType;

  return (
    <Container>
      <BackButton
        variant="outline"
        icon={<ArrowLeft size={16} />}
        onClick={() => window.history.back()}
      >
        Back
      </BackButton>

      <Header>
        <ItemHeader>
          <ItemIconContainer $colorHex={itemType.color?.hexCode}>
            {itemType.image ? (
              <ItemImage
                src={itemType.image.thumbnailUrl || itemType.image.originalUrl}
                alt={itemType.image.altText || itemType.name}
              />
            ) : (
              <Package size={32} />
            )}
          </ItemIconContainer>

          <ItemInfo>
            <ItemName>{itemType.name}</ItemName>
            <ItemMeta>
              <MetaItem>
                <Calendar size={16} />
                <span>Created {new Date(itemType.createdAt).toLocaleDateString()}</span>
              </MetaItem>
              {itemType.community && (
                <MetaItem>
                  <Users size={16} />
                  <CommunityLink to={`/communities/${itemType.communityId}`}>
                    {itemType.community.name}
                  </CommunityLink>
                </MetaItem>
              )}
              {itemType.category && (
                <CategoryBadge>{itemType.category}</CategoryBadge>
              )}
              {itemType.color && (
                <ColorInfo>
                  <ColorPip color={itemType.color.hexCode} size="sm" />
                  <SmallText style={{ margin: 0 }}>{itemType.color.name}</SmallText>
                </ColorInfo>
              )}
            </ItemMeta>
          </ItemInfo>
        </ItemHeader>
      </Header>

      {itemType.description && (
        <DescriptionSection>
          <DescriptionText>{itemType.description}</DescriptionText>
        </DescriptionSection>
      )}

      <PropertiesSection>
        <Heading2 style={{ marginBottom: '0.5rem' }}>Properties</Heading2>
        <PropertiesList>
          {itemType.isStackable && (
            <PropertyBadge $variant="success">
              Stackable
              {itemType.maxStackSize && ` (Max: ${itemType.maxStackSize})`}
            </PropertyBadge>
          )}
          {itemType.isTradeable && (
            <PropertyBadge $variant="info">Tradeable</PropertyBadge>
          )}
          {itemType.isConsumable && (
            <PropertyBadge $variant="info">Consumable</PropertyBadge>
          )}
          {!itemType.isStackable && !itemType.isTradeable && !itemType.isConsumable && (
            <PropertyBadge>No special properties</PropertyBadge>
          )}
        </PropertiesList>
      </PropertiesSection>
    </Container>
  );
};
