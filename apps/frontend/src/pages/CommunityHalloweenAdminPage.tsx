import React, { useState } from "react";
import { usePageMeta } from "../lib/pageMeta";
import styled from "styled-components";
import { Ghost, Check, Undo2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Modal, Stack } from "@chardb/ui";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FilterChip, FilterChips } from "../components/FilterChip";
import { HalloweenSettingsForm } from "../components/halloween/HalloweenSettingsForm";
import { HalloweenPrizeForm } from "../components/halloween/HalloweenPrizeForm";
import {
  HalloweenEventStats,
  HalloweenRunOutForecast,
  HalloweenSimulators,
} from "../components/halloween/HalloweenEventInsights";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { useOffsetPaging } from "../hooks/useOffsetPaging";
import {
  HalloweenDashboardDocument,
  HalloweenWinsDocument,
  HalloweenPrizeDelivery,
  HalloweenWinFilter,
  useHalloweenDashboardQuery,
  useHalloweenWinsQuery,
  useRemoveHalloweenPrizeMutation,
  useSetHalloweenPrizeDeliveredMutation,
  type HalloweenPrizeFieldsFragment,
  type HalloweenWinFieldsFragment,
} from "../generated/graphql";

/**
 * The Halloween trick-or-treat event, for staff.
 *
 * The event itself runs in Discord. This is the bot's old "prize feed" page,
 * plus the prize pool and a way to track the prizes staff hand over
 * themselves -- the ones with no chardb item or character, which nothing else
 * delivers and nothing used to record.
 */

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0 0 1.5rem 0;
  max-width: 70ch;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 2rem 0 0.75rem 0;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  ${SectionTitle} {
    margin-bottom: 0.75rem;
  }
`;

const PrizeName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const Thumb = styled.img`
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
`;

const RowActions = styled.div`
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
`;

const SettingsList = styled.dl`
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 1.5rem;
  margin: 0;
  font-size: 0.875rem;

  dt {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th,
  td {
    text-align: left;
    padding: 0.6rem 0.9rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle;
  }

  th {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    background: ${({ theme }) => theme.colors.background};
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Filters = styled(FilterChips)`
  margin-bottom: 0.75rem;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionsCell = styled.td`
  white-space: nowrap;
`;

const Paging = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.75rem;
`;

const Empty = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 2.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const WINS_PAGE_SIZE = 50;

const isStaffPrize = (win: HalloweenWinFieldsFragment) =>
  win.prize.delivery === HalloweenPrizeDelivery.Staff;

const PRIZE_TYPE_LABEL: Record<HalloweenPrizeDelivery, string> = {
  [HalloweenPrizeDelivery.ChardbItem]: "Item",
  [HalloweenPrizeDelivery.ChardbCharacter]: "Character",
  [HalloweenPrizeDelivery.Staff]: "Other / off-site",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

/** A Discord user, by id: the dashboard has no way to look up names. */
const DiscordUser: React.FC<{ id: string }> = ({ id }) => (
  <a href={`https://discord.com/users/${id}`} target="_blank" rel="noreferrer">
    {id}
  </a>
);

export const CommunityHalloweenAdminPage: React.FC = () => {
  usePageMeta({ title: "Halloween Event" });

  const communityId = useCommunityId();
  const community = useHostCommunity();
  const { permissions, loading: roleLoading } = useUserCommunityRole(
    communityId ?? undefined,
  );
  const [filter, setFilter] = useState<HalloweenWinFilter>(
    HalloweenWinFilter.All,
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  /** The prize form: open with null to add, with a prize to edit. */
  const [prizeForm, setPrizeForm] = useState<{
    prize: HalloweenPrizeFieldsFragment | null;
  } | null>(null);
  const [removing, setRemoving] = useState<HalloweenPrizeFieldsFragment | null>(
    null,
  );
  const [undoing, setUndoing] = useState<HalloweenWinFieldsFragment | null>(
    null,
  );

  const enabled = Boolean(community?.halloweenEnabled);
  // Handing prizes out and setting the pool up are different jobs: either
  // one shows the page, and each unlocks its own buttons.
  const canGrant = Boolean(permissions.canGrantItems);
  const canManage = Boolean(permissions.canManageItems);
  const allowed = canGrant || canManage;
  const skip = !communityId || !enabled || !allowed;

  const { data, loading, error, refetch } = useHalloweenDashboardQuery({
    variables: { communityId: communityId as string },
    skip,
    fetchPolicy: "cache-and-network",
  });
  // Filtered and paged on the server: an event can run to thousands of wins.
  const {
    data: winsData,
    loading: winsLoading,
    fetchMore,
  } = useHalloweenWinsQuery({
    variables: {
      communityId: communityId as string,
      filter,
      limit: WINS_PAGE_SIZE,
      offset: 0,
    },
    skip,
    fetchPolicy: "cache-and-network",
  });
  // The dashboard is refetched for its "to deliver" count. Under All the win
  // updates in place through the cache; under a delivery filter it no longer
  // belongs, so the list is asked for again, or the next page's offset would
  // skip wins.
  const [setDelivered] = useSetHalloweenPrizeDeliveredMutation({
    refetchQueries:
      filter === HalloweenWinFilter.All
        ? [HalloweenDashboardDocument]
        : [HalloweenDashboardDocument, HalloweenWinsDocument],
  });
  const [removePrize, { loading: removingPrize }] =
    useRemoveHalloweenPrizeMutation({
      refetchQueries: [HalloweenDashboardDocument],
    });

  const handleRemove = async (prize: HalloweenPrizeFieldsFragment) => {
    if (!communityId) return;
    try {
      await removePrize({ variables: { communityId, prizeId: prize.id } });
      toast.success(`Removed ${prize.name}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove that prize",
      );
    } finally {
      setRemoving(null);
    }
  };

  const dashboard = data?.halloweenDashboard;
  const page = winsData?.halloweenWins;
  const wins = page?.wins ?? [];

  const { loadMore, loadingMore } = useOffsetPaging({
    pageSize: WINS_PAGE_SIZE,
    loaded: wins.length,
    hasMore: page?.hasMore ?? false,
    load: ({ limit, offset }) =>
      fetchMore({
        variables: { limit, offset },
        updateQuery: (previous, { fetchMoreResult }) =>
          fetchMoreResult
            ? {
                halloweenWins: {
                  ...fetchMoreResult.halloweenWins,
                  wins: [
                    ...previous.halloweenWins.wins,
                    ...fetchMoreResult.halloweenWins.wins,
                  ],
                },
              }
            : previous,
      }),
  });

  const handleDelivered = async (
    win: HalloweenWinFieldsFragment,
    delivered: boolean,
  ) => {
    if (!communityId) return;
    setBusyId(win.id);
    try {
      await setDelivered({
        variables: { communityId, knockEventId: win.id, delivered },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update that prize",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!communityId) return null;

  // Checked before permissions: a community without the event should not
  // learn anything about it, even from an access message.
  if (!enabled) {
    return (
      <Container>
        <Empty>The Halloween event is not enabled for this community.</Empty>
      </Container>
    );
  }

  if (roleLoading || (loading && !data)) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  if (!allowed) {
    return (
      <Container>
        <Empty>
          The Halloween event&apos;s page needs permission to grant or manage
          items in this community.
        </Empty>
      </Container>
    );
  }

  if (error || !dashboard) {
    return (
      <Container>
        <Empty>{error?.message ?? "Could not load the event."}</Empty>
      </Container>
    );
  }

  const { settings, summary } = dashboard;

  return (
    <Container data-testid="halloween-admin-page">
      <Title>
        <Ghost size={28} /> Halloween event
      </Title>
      <Subtitle>
        Players trick-or-treat in Discord; the event is run from here. Chardb
        items and characters deliver themselves once the winner links Discord;
        anything else, staff hand over and mark delivered.
      </Subtitle>

      {!dashboard.guildId ? (
        <Empty>
          Link a Discord server in community settings to see the event here.
        </Empty>
      ) : !settings ? (
        canManage ? (
          <>
            <SectionTitle>Set up the event</SectionTitle>
            <Subtitle>
              Players can knock once there is a start date and some prizes.
            </Subtitle>
            <HalloweenSettingsForm
              communityId={communityId}
              settings={null}
              onSaved={() => void refetch()}
            />
          </>
        ) : (
          <Empty>
            The event has not been set up yet. Someone who can manage items sets
            it up here.
          </Empty>
        )
      ) : (
        <>
          <HalloweenEventStats summary={summary} prizes={dashboard.prizes} />
          <SectionTitle>Simulators</SectionTitle>
          <Stack gap="md">
            <HalloweenSimulators
              prizes={dashboard.prizes}
              winRate={settings.winRate}
              candySlugs={data?.halloweenCandyTypes ?? []}
            />
            <HalloweenRunOutForecast
              // New settings start the what-ifs over from them.
              key={`${settings.winRate}:${settings.knocksPerDay}:${settings.startDate}:${settings.endDate}`}
              prizes={dashboard.prizes}
              winRate={settings.winRate}
              knocksPerDay={settings.knocksPerDay}
              last24Hours={summary.last24Hours}
              yesterday={summary.yesterday ?? null}
              startDate={settings.startDate ?? null}
              endDate={settings.endDate ?? null}
              now={new Date()}
            />
          </Stack>
          <SectionHeader>
            <SectionTitle>Settings</SectionTitle>
            {canManage && !editingSettings && (
              <Button
                tone="secondary"
                size="sm"
                onClick={() => setEditingSettings(true)}
              >
                <Pencil size={14} /> Edit settings
              </Button>
            )}
          </SectionHeader>
          {editingSettings ? (
            <HalloweenSettingsForm
              communityId={communityId}
              settings={settings}
              onSaved={() => {
                setEditingSettings(false);
                void refetch();
              }}
              onCancel={() => setEditingSettings(false)}
            />
          ) : (
            <SettingsList data-testid="halloween-settings">
              <dt>Starts</dt>
              <dd>
                {settings.startDate
                  ? formatDate(settings.startDate)
                  : "Not started"}
              </dd>
              <dt>Ends</dt>
              <dd>
                {settings.endDate
                  ? formatDate(settings.endDate)
                  : "Runs until stopped"}
              </dd>
              <dt>Knocks a day</dt>
              <dd>{settings.knocksPerDay}</dd>
              <dt>Resets at</dt>
              <dd>{`${settings.resetTime}:00 US Central`}</dd>
              <dt>Win rate</dt>
              <dd>{`${Math.round(settings.winRate * 100)}%`}</dd>
              <dt>Win channel</dt>
              <dd>{settings.winChannel ?? <Muted>None</Muted>}</dd>
            </SettingsList>
          )}

          <SectionHeader>
            <SectionTitle>Prize pool</SectionTitle>
            {canManage && (
              <Button
                tone="primary"
                size="sm"
                onClick={() => setPrizeForm({ prize: null })}
              >
                <Plus size={14} /> Add prize
              </Button>
            )}
          </SectionHeader>
          {dashboard.prizes.length === 0 ? (
            <Empty>No prizes yet.</Empty>
          ) : (
            <TableWrap>
              <Table data-testid="halloween-prize-pool">
                <thead>
                  <tr>
                    <th>Prize</th>
                    <th>Left</th>
                    <th>Weight</th>
                    <th>Prize type</th>
                    {canManage && <th aria-label="Actions" />}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.prizes.map((prize) => (
                    <tr key={prize.id}>
                      <td>
                        <PrizeName>
                          {prize.image && <Thumb src={prize.image} alt="" />}
                          <span>
                            {prize.name} <Muted>({prize.id})</Muted>
                          </span>
                        </PrizeName>
                      </td>
                      <td>{`${prize.currentStock} / ${prize.initialStock}`}</td>
                      <td>{prize.weight}</td>
                      <td>{PRIZE_TYPE_LABEL[prize.delivery]}</td>
                      {canManage && (
                        <td>
                          <RowActions>
                            <Button
                              tone="secondary"
                              size="sm"
                              aria-label={`Edit ${prize.name}`}
                              onClick={() => setPrizeForm({ prize })}
                            >
                              <Pencil size={14} /> Edit
                            </Button>
                            <Button
                              tone="danger"
                              size="sm"
                              aria-label={`Remove ${prize.name}`}
                              onClick={() => setRemoving(prize)}
                            >
                              <Trash2 size={14} /> Remove
                            </Button>
                          </RowActions>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}

          <SectionTitle>Wins</SectionTitle>
          <Filters>
            <FilterChip
              active={filter === HalloweenWinFilter.All}
              onClick={() => setFilter(HalloweenWinFilter.All)}
            >
              All ({summary.wins})
            </FilterChip>
            <FilterChip
              active={filter === HalloweenWinFilter.NeedsDelivery}
              onClick={() => setFilter(HalloweenWinFilter.NeedsDelivery)}
            >
              Needs delivery ({summary.toDeliver})
            </FilterChip>
            <FilterChip
              active={filter === HalloweenWinFilter.Delivered}
              onClick={() => setFilter(HalloweenWinFilter.Delivered)}
            >
              Delivered
            </FilterChip>
          </Filters>

          {winsLoading && !page ? (
            <LoadingSpinner />
          ) : wins.length === 0 ? (
            <Empty>
              {filter === HalloweenWinFilter.All
                ? "Nobody has won anything yet."
                : "No win matches that."}
            </Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Winner</th>
                    <th>Prize</th>
                    <th>DeviantArt</th>
                    <th>Status</th>
                    {canGrant && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {wins.map((win) => (
                    <tr key={win.id} data-testid={`halloween-win-${win.id}`}>
                      <td>{formatDate(win.time)}</td>
                      <td>
                        <DiscordUser id={win.discordUserId} />
                        {win.giftyFromDiscordUserId && (
                          <div>
                            <Muted>
                              Gifty from{" "}
                              <DiscordUser id={win.giftyFromDiscordUserId} />
                            </Muted>
                          </div>
                        )}
                      </td>
                      <td>{win.prize.name}</td>
                      <td>
                        {win.deviantArtName ? (
                          <a
                            href={`https://www.deviantart.com/${win.deviantArtName}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {win.deviantArtName}
                          </a>
                        ) : (
                          <Muted>—</Muted>
                        )}
                      </td>
                      <td>
                        <WinStatus win={win} />
                      </td>
                      {canGrant && (
                        <ActionsCell>
                          <WinActions
                            win={win}
                            busy={busyId === win.id}
                            onDeliver={() => void handleDelivered(win, true)}
                            onUndo={() => setUndoing(win)}
                          />
                        </ActionsCell>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
          {page && wins.length > 0 && (
            <Paging>
              <Muted>
                Showing {wins.length} of {page.total}
              </Muted>
              {page.hasMore && (
                <Button
                  tone="secondary"
                  disabled={loadingMore}
                  onClick={loadMore}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              )}
            </Paging>
          )}
        </>
      )}

      <Modal
        isOpen={prizeForm !== null}
        onClose={() => setPrizeForm(null)}
        title={
          prizeForm?.prize ? `Edit ${prizeForm.prize.name}` : "Add a prize"
        }
      >
        {prizeForm && (
          <HalloweenPrizeForm
            communityId={communityId}
            prize={prizeForm.prize}
            onSaved={() => {
              setPrizeForm(null);
              void refetch();
            }}
            onCancel={() => setPrizeForm(null)}
          />
        )}
      </Modal>

      {/* Only offered for a prize, and refused by the server for one
          somebody has won: a win keeps its prize on record. */}
      <ConfirmDialog
        open={removing !== null}
        destructive
        title={removing ? `Remove ${removing.name}?` : "Remove prize?"}
        confirmLabel="Remove"
        busy={removingPrize}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) void handleRemove(removing);
        }}
      >
        It comes out of the pool for good. A prize somebody has already won
        cannot be removed; set its stock to 0 instead.
      </ConfirmDialog>

      <ConfirmDialog
        open={undoing !== null}
        title="Mark not delivered?"
        confirmLabel="Mark not delivered"
        busy={undoing !== null && busyId === undoing.id}
        onCancel={() => setUndoing(null)}
        onConfirm={() => {
          if (!undoing) return;
          void handleDelivered(undoing, false).then(() => setUndoing(null));
        }}
      >
        This clears who delivered it and when.
      </ConfirmDialog>
    </Container>
  );
};

const WinStatus: React.FC<{ win: HalloweenWinFieldsFragment }> = ({ win }) => {
  if (!isStaffPrize(win)) {
    // Granted to the winner's Discord account at the win; it is theirs once
    // they have linked Discord and are a member of the community.
    if (!win.linkedUser) {
      return (
        <Status>
          <Muted>Waiting for them to link Discord</Muted>
        </Status>
      );
    }
    return win.linkedUserIsMember ? (
      <Status>On chardb: @{win.linkedUser.username}</Status>
    ) : (
      <Status>
        <Muted>Waiting for them to join the community</Muted>
      </Status>
    );
  }

  if (win.deliveredAt) {
    return (
      <Status>
        Delivered by @{win.deliveredBy?.username ?? "someone"},{" "}
        {formatDate(win.deliveredAt)}
      </Status>
    );
  }

  return <Status>Staff to deliver</Status>;
};

/**
 * Only shown with permission to grant items; managing the pool alone does
 * not give it. Chardb prizes deliver themselves, so they get no buttons.
 */
const WinActions: React.FC<{
  win: HalloweenWinFieldsFragment;
  busy: boolean;
  onDeliver: () => void;
  onUndo: () => void;
}> = ({ win, busy, onDeliver, onUndo }) => {
  if (!isStaffPrize(win)) return null;

  return win.deliveredAt ? (
    <Button
      tone="secondary"
      size="sm"
      disabled={busy}
      onClick={onUndo}
      aria-label="Undo delivered"
    >
      <Undo2 size={14} /> Undo
    </Button>
  ) : (
    <Button tone="primary" size="sm" disabled={busy} onClick={onDeliver}>
      <Check size={14} /> {busy ? "Saving…" : "Mark delivered"}
    </Button>
  );
};

export default CommunityHalloweenAdminPage;
