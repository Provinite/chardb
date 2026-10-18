import React, { useMemo, useState } from "react";
import { usePageMeta } from "../lib/pageMeta";
import styled from "styled-components";
import { Ghost, Check, Undo2 } from "lucide-react";
import { Button } from "@chardb/ui";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import {
  HalloweenPrizeDelivery,
  useHalloweenDashboardQuery,
  useSetHalloweenPrizeDeliveredMutation,
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

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
`;

const Stat = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  padding: 0.75rem 1rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const SettingsLine = styled.p`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0.75rem 0 0 0;
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

const Filters = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const Status = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const Empty = styled.div`
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 2.5rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.muted};
`;

type Filter = "all" | "needs-delivery" | "delivered";

const isStaffPrize = (win: HalloweenWinFieldsFragment) =>
  win.prize.delivery === HalloweenPrizeDelivery.Staff;

const needsDelivery = (win: HalloweenWinFieldsFragment) =>
  isStaffPrize(win) && !win.deliveredAt;

const DELIVERY_LABEL: Record<HalloweenPrizeDelivery, string> = {
  [HalloweenPrizeDelivery.ChardbItem]: "Chardb item",
  [HalloweenPrizeDelivery.ChardbCharacter]: "Chardb character",
  [HalloweenPrizeDelivery.Staff]: "Staff deliver",
};

const formatDate = (iso: string) => new Date(iso).toLocaleString();

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
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const enabled = Boolean(community?.halloweenEnabled);
  const allowed = Boolean(permissions.canGrantItems);

  const { data, loading, error } = useHalloweenDashboardQuery({
    variables: { communityId: communityId as string },
    skip: !communityId || !enabled || !allowed,
    fetchPolicy: "cache-and-network",
  });
  const [setDelivered] = useSetHalloweenPrizeDeliveredMutation();

  const dashboard = data?.halloweenDashboard;
  const wins = useMemo(() => dashboard?.wins ?? [], [dashboard]);
  const shown = useMemo(() => {
    if (filter === "needs-delivery") return wins.filter(needsDelivery);
    if (filter === "delivered")
      return wins.filter((w) => isStaffPrize(w) && w.deliveredAt);
    return wins;
  }, [wins, filter]);
  const outstanding = wins.filter(needsDelivery).length;

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
          The Halloween event&apos;s prize feed needs permission to grant items
          in this community.
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
        Trick-or-treat runs in Discord. This is what has been won, what is left,
        and which prizes staff still need to hand over. Chardb items and
        characters deliver themselves once the winner links Discord.
      </Subtitle>

      {!dashboard.guildId ? (
        <Empty>
          Link a Discord server in community settings to see the event here.
        </Empty>
      ) : (
        <>
          <Stats data-testid="halloween-summary">
            <Stat>
              <StatValue>{summary.knocks}</StatValue>
              <StatLabel>Knocks</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{summary.wins}</StatValue>
              <StatLabel>Wins</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{summary.players}</StatValue>
              <StatLabel>Players</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{summary.giftiesSent}</StatValue>
              <StatLabel>Gifties sent</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{outstanding}</StatValue>
              <StatLabel>To deliver</StatLabel>
            </Stat>
          </Stats>
          <SettingsLine>
            {settings ? (
              <>
                {settings.startDate
                  ? `Runs ${formatDate(settings.startDate)}`
                  : "No start date"}
                {settings.endDate
                  ? ` – ${formatDate(settings.endDate)}`
                  : ", no end date"}
                {` · ${settings.knocksPerDay} knocks a day, resetting at ${settings.resetTime}:00 US Central · ${Math.round(settings.winRate * 100)}% win rate`}
              </>
            ) : (
              "Not set up yet: an admin runs /settings set in Discord."
            )}
          </SettingsLine>

          <SectionTitle>Prize pool</SectionTitle>
          {dashboard.prizes.length === 0 ? (
            <Empty>No prizes yet. Add them with /prize admin add.</Empty>
          ) : (
            <TableWrap>
              <Table data-testid="halloween-prize-pool">
                <thead>
                  <tr>
                    <th>Prize</th>
                    <th>Left</th>
                    <th>Weight</th>
                    <th>Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.prizes.map((prize) => (
                    <tr key={prize.id}>
                      <td>
                        {prize.name} <Muted>({prize.id})</Muted>
                      </td>
                      <td>{`${prize.currentStock} / ${prize.initialStock}`}</td>
                      <td>{prize.weight}</td>
                      <td>{DELIVERY_LABEL[prize.delivery]}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}

          <SectionTitle>Wins</SectionTitle>
          <Filters>
            <Button
              variant={filter === "all" ? "primary" : "secondary"}
              onClick={() => setFilter("all")}
            >
              All ({wins.length})
            </Button>
            <Button
              variant={filter === "needs-delivery" ? "primary" : "secondary"}
              onClick={() => setFilter("needs-delivery")}
            >
              Needs delivery ({outstanding})
            </Button>
            <Button
              variant={filter === "delivered" ? "primary" : "secondary"}
              onClick={() => setFilter("delivered")}
            >
              Delivered
            </Button>
          </Filters>

          {shown.length === 0 ? (
            <Empty>
              {wins.length === 0
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
                  </tr>
                </thead>
                <tbody>
                  {shown.map((win) => (
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
                        <WinStatus
                          win={win}
                          busy={busyId === win.id}
                          onChange={(delivered) =>
                            void handleDelivered(win, delivered)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </>
      )}
    </Container>
  );
};

const WinStatus: React.FC<{
  win: HalloweenWinFieldsFragment;
  busy: boolean;
  onChange: (delivered: boolean) => void;
}> = ({ win, busy, onChange }) => {
  if (!isStaffPrize(win)) {
    // Granted to the winner's Discord account at the win; whether they have
    // it yet depends only on whether they have linked Discord.
    return win.linkedUser ? (
      <Status>On chardb: @{win.linkedUser.username}</Status>
    ) : (
      <Status>
        <Muted>Waiting for them to link Discord</Muted>
      </Status>
    );
  }

  if (win.deliveredAt) {
    return (
      <Status>
        <span>
          Delivered by @{win.deliveredBy?.username ?? "someone"},{" "}
          {formatDate(win.deliveredAt)}
        </span>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => onChange(false)}
          aria-label="Undo delivered"
        >
          <Undo2 size={14} /> Undo
        </Button>
      </Status>
    );
  }

  return (
    <Status>
      <span>Staff to deliver</span>
      <Button variant="primary" disabled={busy} onClick={() => onChange(true)}>
        <Check size={14} /> {busy ? "Saving…" : "Mark delivered"}
      </Button>
    </Status>
  );
};

export default CommunityHalloweenAdminPage;
