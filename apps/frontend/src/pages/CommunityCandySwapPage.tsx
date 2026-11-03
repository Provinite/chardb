import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { usePageMeta } from "../lib/pageMeta";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CandySwapView } from "../components/halloween/CandySwapView";
import { candyName } from "../components/halloween/candyBoard";
import {
  type HalloweenCandyTradeFieldsFragment,
  CandySwapDocument,
  CandySwapMarketDocument,
  CandySwapRecentTradesDocument,
  useAcceptHalloweenCandyOfferMutation,
  useCancelHalloweenCandyOfferMutation,
  useCandySwapMarketQuery,
  useCandySwapQuery,
  useCandySwapRecentTradesQuery,
  usePlaceHalloweenCandyOfferMutation,
} from "../generated/graphql";

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

const tradedToast = (trade: HalloweenCandyTradeFieldsFragment) => {
  const who = trade.with
    ? trade.with.displayName || trade.with.username
    : (trade.host ?? "someone");
  toast.success(
    `Traded with ${who}: you got ${trade.received.map(candyName).join(", ")}`,
  );
};

/**
 * `/halloween/swap`: offering candies for others, and taking other players'
 * offers. Offers are anonymous; the history names whom each trade was with.
 */
export const CommunityCandySwapPage: React.FC = () => {
  const communityId = useCommunityId();
  const enabled = Boolean(useHostCommunity()?.halloweenEnabled);
  usePageMeta({ title: "Candy swap", description: "Halloween candies" });

  const skip = !communityId || !enabled;
  const variables = { communityId: communityId as string };
  const swap = useCandySwapQuery({
    variables,
    skip,
    fetchPolicy: "cache-and-network",
  });
  const market = useCandySwapMarketQuery({
    variables,
    skip,
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const recent = useCandySwapRecentTradesQuery({
    variables,
    skip,
    fetchPolicy: "cache-and-network",
  });
  const [rerolling, setRerolling] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Every change can change which candies are spare, and so which offers
  // can be taken; everything is fetched again after any of them.
  const refetchSwap = [
    { query: CandySwapDocument, variables },
    { query: CandySwapMarketDocument, variables },
    { query: CandySwapRecentTradesDocument, variables },
  ];
  const [place, { loading: placing }] = usePlaceHalloweenCandyOfferMutation({
    refetchQueries: refetchSwap,
    awaitRefetchQueries: true,
  });
  const [accept] = useAcceptHalloweenCandyOfferMutation({
    refetchQueries: refetchSwap,
    awaitRefetchQueries: true,
  });
  const [cancel] = useCancelHalloweenCandyOfferMutation({
    refetchQueries: refetchSwap,
    awaitRefetchQueries: true,
  });

  if (!enabled) {
    return <p>Halloween isn't running in this community.</p>;
  }
  if (swap.loading && !swap.data) return <LoadingSpinner />;
  if (swap.error || !swap.data) {
    return <p>{swap.error?.message ?? "Could not load the candy swap"}</p>;
  }
  const data = swap.data;

  const reroll = async () => {
    setRerolling(true);
    try {
      await market.refetch();
    } catch {
      // The query's error shows on the page; keep what was on screen.
    } finally {
      setRerolling(false);
    }
  };

  const retryRecent = async () => {
    try {
      await recent.refetch();
    } catch {
      // The query's error shows on the page.
    }
  };

  const onPlace = async (candyIds: number[], wantSlug: string | null) => {
    try {
      const result = await place({
        variables: { ...variables, candyIds, wantSlug },
      });
      const trade = result.data?.placeHalloweenCandyOffer.trade;
      if (trade) {
        tradedToast(trade);
      } else {
        toast.success("Offer placed");
      }
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not place the offer"));
      return false;
    }
  };

  const onAccept = async (offerId: string, giveSlug?: string) => {
    setAcceptingId(offerId);
    try {
      const result = await accept({
        variables: { ...variables, offerId, giveSlug: giveSlug ?? null },
      });
      if (result.data) tradedToast(result.data.acceptHalloweenCandyOffer);
    } catch (e) {
      toast.error(errorMessage(e, "Could not take the offer"));
      // Taken or withdrawn by someone else first: show what is left.
      void market.refetch();
    } finally {
      setAcceptingId(null);
    }
  };

  const onCancel = async (offerId: string) => {
    setCancellingId(offerId);
    try {
      await cancel({ variables: { ...variables, offerId } });
    } catch (e) {
      toast.error(errorMessage(e, "Could not cancel the offer"));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <CandySwapView
      candyTypes={data.halloweenCandyTypes}
      myCandies={data.myHalloweenCandies}
      listings={market.data?.halloweenCandySwapMarket.listings ?? null}
      activity={market.data?.halloweenCandySwapMarket ?? null}
      recentTrades={recent.data?.halloweenCandySwapRecentTrades ?? null}
      marketFailed={!market.data && Boolean(market.error)}
      recentFailed={!recent.data && Boolean(recent.error)}
      onRetryRecent={() => void retryRecent()}
      now={new Date()}
      myOffers={data.myHalloweenCandyOffers}
      trades={data.myHalloweenCandyTrades}
      maxOpenOffers={data.halloweenCandySwapLimits.maxOpenOffers}
      maxOffered={data.halloweenCandySwapLimits.maxOfferedCandies}
      onPlace={onPlace}
      onAccept={onAccept}
      onCancel={onCancel}
      onReroll={reroll}
      placing={placing}
      acceptingId={acceptingId}
      cancellingId={cancellingId}
      rerolling={rerolling}
      noCandies={<Link to="/profile/edit">Link your Discord account</Link>}
    />
  );
};
