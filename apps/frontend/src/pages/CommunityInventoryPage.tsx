import React from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { Package } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useQuery } from "@apollo/client";
import { GET_MY_INVENTORY } from "../graphql/items.graphql";
import { useCommunityByIdQuery } from "../generated/graphql";
import { useAuth } from "../contexts/AuthContext";

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
`;

const InventoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
`;

const ItemCard = styled.div<{ color?: string }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ color, theme }) => color || theme.colors.border};
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const ItemIconContainer = styled.div<{ color?: string }>`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  background: ${({ color, theme }) => color || theme.colors.primary}15;
  border: 2px solid ${({ color, theme }) => color || theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  position: relative;
`;

const ItemImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
`;

const QuantityBadge = styled.div`
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ItemInfo = styled.div``;

const ItemName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ItemCategory = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
  margin-bottom: 0.5rem;
`;

const ItemDescription = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 1rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyIcon = styled.div`
  margin: 0 auto 1.5rem;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;


export const CommunityInventoryPage: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const { user } = useAuth();

  const { data: communityData, loading: communityLoading } =
    useCommunityByIdQuery({
      variables: { id: communityId! },
      skip: !communityId,
    });

  const { data: inventoryData, loading: inventoryLoading } = useQuery(GET_MY_INVENTORY, {
    variables: { communityId },
    skip: !communityId || !user,
  });

  if (!user) {
    return (
      <Container>
        <EmptyState>
          <EmptyTitle>Login Required</EmptyTitle>
          <EmptyDescription>
            Please log in to view your inventory.
          </EmptyDescription>
        </EmptyState>
      </Container>
    );
  }

  if (communityLoading || inventoryLoading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    );
  }

  // Get the inventory for this community (will be first and only one since we filtered by communityId)
  const inventory = inventoryData?.me?.inventories?.[0];
  const items = inventory?.items || [];

  return (
    <Container>
      <Header>
        <Title>Your Inventory</Title>
        <Subtitle>
          Items in {communityData?.community?.name || "this community"}
        </Subtitle>
      </Header>

      {items.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <Package size={40} />
          </EmptyIcon>
          <EmptyTitle>No Items Yet</EmptyTitle>
          <EmptyDescription>
            You don't have any items in this community yet. Items can be granted by
            community administrators.
          </EmptyDescription>
        </EmptyState>
      ) : (
        <InventoryGrid>
          {items.map((item: any) => (
            <ItemCard key={item.id} color={item.itemType.color}>
              <ItemIconContainer color={item.itemType.color}>
                {item.itemType.image ? (
                  <ItemImage
                    src={item.itemType.image.thumbnailUrl || item.itemType.image.originalUrl}
                    alt={item.itemType.image.altText || item.itemType.name}
                  />
                ) : (
                  <Package size={48} />
                )}
                {item.quantity > 1 && <QuantityBadge>×{item.quantity}</QuantityBadge>}
              </ItemIconContainer>

              <ItemInfo>
                <ItemName title={item.itemType.name}>{item.itemType.name}</ItemName>
                {item.itemType.category && (
                  <ItemCategory>{item.itemType.category}</ItemCategory>
                )}
                {item.itemType.description && (
                  <ItemDescription>{item.itemType.description}</ItemDescription>
                )}
              </ItemInfo>
            </ItemCard>
          ))}
        </InventoryGrid>
      )}
    </Container>
  );
};
