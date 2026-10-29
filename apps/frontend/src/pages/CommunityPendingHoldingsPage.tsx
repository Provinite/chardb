import React, { useState } from "react";
import styled from "styled-components";
import { Link, useParams } from "react-router-dom";
import { Package } from "lucide-react";
import { Button } from "@chardb/ui";
import { usePageMeta } from "../lib/pageMeta";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ProviderIcon } from "../components/ProviderIcon";
import { RemoveItemsDialog } from "../components/items/RemoveItemsDialog";
import { useCommunityId } from "../contexts/CommunityHostContext";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import {
  ExternalAccountProvider,
  useGetPendingHoldingsQuery,
} from "../generated/graphql";
import {
  PROVIDER_NAME,
  pendingLabel,
  providerFromPath,
} from "../lib/pendingOwner";

/**
 * What still waits on someone with no account here -- an event winner known
 * only by Discord, say -- for staff to find and clean up (#445).
 *
 * Reached from the item ledger, where their name links here. Staff only: the
 * server answers for viewers who can grant items, which is what removing
 * takes.
 */

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 1.5rem 0;
`;

const Groups = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: 0;
  }
`;

const Swatch = styled.div<{ $hex?: string | null }>`
  width: 36px;
  height: 36px;
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $hex }) =>
    $hex ? `${$hex}22` : theme.colors.surface};
  color: ${({ theme, $hex }) => $hex || theme.colors.text.muted};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Name = styled.div`
  flex: 1;
  min-width: 0;
  font-weight: 500;

  small {
    display: block;
    font-weight: 400;
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Count = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Empty = styled.div`
  padding: 3rem 1rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

export const CommunityPendingHoldingsPage: React.FC = () => {
  const communityId = useCommunityId();
  const { provider: providerSlug, accountId } = useParams<{
    provider: string;
    accountId: string;
  }>();
  const provider = providerFromPath(providerSlug);
  const { permissions } = useUserCommunityRole(communityId ?? undefined);

  const { data, loading, error, refetch } = useGetPendingHoldingsQuery({
    variables: {
      communityId: communityId ?? "",
      // Never sent as this: skipped below when the provider is unknown.
      provider: provider ?? ExternalAccountProvider.Discord,
      providerAccountId: accountId ?? "",
    },
    skip: !communityId || !provider || !accountId,
  });

  const [removing, setRemoving] = useState<{
    itemTypeName: string;
    itemIds: string[];
  } | null>(null);

  const report = data?.pendingHoldings;
  const who = report ? pendingLabel(report.holder) : "Unclaimed items";
  usePageMeta({ title: who });

  if (!provider) {
    return (
      <Container>
        <Empty>That is not an account this site knows about.</Empty>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  if (error || !report) {
    return (
      <Container>
        <Empty>
          <p>
            Those holdings could not be loaded. Only staff who can grant items
            can see them.
          </p>
          {error && <p>{error.message}</p>}
        </Empty>
      </Container>
    );
  }

  return (
    <Container>
      <Title>
        <ProviderIcon provider={report.holder.provider} size={28} />
        {who}
      </Title>
      <Subtitle>
        No account here yet. These wait for them until they link{" "}
        {PROVIDER_NAME[report.holder.provider]} and join.
      </Subtitle>

      {report.holdings.length === 0 ? (
        <Empty data-testid="pending-holdings-empty">
          <Package size={36} style={{ opacity: 0.5 }} />
          <p>Nothing is left waiting for them here.</p>
        </Empty>
      ) : (
        <Groups>
          {report.holdings.map((h) => (
            <Group
              key={h.itemType.id}
              data-testid="pending-holding-group"
              data-item-type-id={h.itemType.id}
            >
              <Swatch $hex={h.itemType.color?.hexCode}>
                {h.itemType.image ? (
                  <img
                    src={
                      h.itemType.image.thumbnailUrl ||
                      h.itemType.image.originalUrl
                    }
                    alt={h.itemType.image.altText || h.itemType.name}
                  />
                ) : (
                  <Package size={18} />
                )}
              </Swatch>
              <Name>
                <Link to={`/item-types/${h.itemType.id}`}>
                  {h.itemType.name}
                </Link>
                {h.itemType.category && <small>{h.itemType.category}</small>}
              </Name>
              <Count>×{h.count}</Count>
              {permissions.canGrantItems && (
                <Button
                  variant="secondary"
                  size="sm"
                  data-testid="remove-items"
                  onClick={() =>
                    setRemoving({
                      itemTypeName: h.itemType.name,
                      itemIds: h.items.map((i) => i.id),
                    })
                  }
                >
                  Remove…
                </Button>
              )}
            </Group>
          ))}
        </Groups>
      )}

      <RemoveItemsDialog
        open={removing !== null}
        itemTypeName={removing?.itemTypeName ?? ""}
        itemIds={removing?.itemIds ?? []}
        holderLabel={who}
        onClose={() => setRemoving(null)}
        onRemoved={() => {
          setRemoving(null);
          void refetch();
        }}
      />
    </Container>
  );
};
