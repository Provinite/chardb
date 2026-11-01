import React, { useEffect, useState } from "react";
import { usePageMeta } from "../lib/pageMeta";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { HostAwareLink } from "../components/HostAwareLink";
import {
  PrizeListView,
  type PublicWin,
} from "../components/halloween/PrizeListView";
import { useHalloweenPrizeListQuery } from "../generated/graphql";

/** How often the feed fetches again, and its times count on. */
const REFRESH_MS = 60_000;

/**
 * `/halloween/prizes`: every prize in the community's Halloween pool and the
 * latest wins, for anyone. The server decides what each viewer sees of a
 * winner.
 */
export const CommunityHalloweenPrizesPage: React.FC = () => {
  const communityId = useCommunityId();
  const enabled = Boolean(useHostCommunity()?.halloweenEnabled);
  usePageMeta({
    title: "Halloween prizes",
    description: "Every Halloween prize and the latest wins",
  });

  const { data, error } = useHalloweenPrizeListQuery({
    variables: { communityId: communityId as string },
    skip: !communityId || !enabled,
    fetchPolicy: "cache-and-network",
    pollInterval: REFRESH_MS,
  });
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  if (!enabled) {
    return <p>Halloween isn't running in this community.</p>;
  }
  if (error && !data) {
    return <p>{error.message}</p>;
  }

  const wins: PublicWin[] | null =
    data?.halloweenRecentWins.map((w) => ({ ...w, time: String(w.time) })) ??
    null;

  return (
    <PrizeListView
      prizes={data?.halloweenPrizes ?? null}
      wins={wins}
      now={now}
      LinkComponent={HostAwareLink}
    />
  );
};
