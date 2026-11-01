import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { usePageMeta } from "../lib/pageMeta";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  CandySwapView,
  type SwapTrade,
} from "../components/halloween/CandySwapView";
import { candyName } from "../components/halloween/candyBoard";
import {
  CandySwapDocument,
  useAcceptHalloweenCandyOfferMutation,
  useCancelHalloweenCandyOfferMutation,
  useCandySwapOffersQuery,
  useCandySwapQuery,
  usePlaceHalloweenCandyOfferMutation,
} from "../generated/graphql";

/** The most open offers a player may have. Mirrors the backend's limit. */
const MAX_OPEN_OFFERS = 10;

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;

const tradedToast = (trade: SwapTrade) => {
  const who = trade.with
    ? trade.with.displayName || trade.with.username
    : "someone";
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
  const offers = useCandySwapOffersQuery({
    variables,
    skip,
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const [rerolling, setRerolling] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const refetchSwap = [{ query: CandySwapDocument, variables }];
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
      await offers.refetch();
    } finally {
      setRerolling(false);
    }
  };

  const onPlace = async (candyIds: number[], wantSlug: string) => {
    try {
      const result = await place({
        variables: { ...variables, candyIds, wantSlug },
      });
      const trade = result.data?.placeHalloweenCandyOffer.trade;
      if (trade) {
        tradedToast(trade);
        void offers.refetch();
      } else {
        toast.success("Offer placed");
      }
      return true;
    } catch (e) {
      toast.error(errorMessage(e, "Could not place the offer"));
      return false;
    }
  };

  const onAccept = async (offerId: string) => {
    setAcceptingId(offerId);
    try {
      const result = await accept({ variables: { ...variables, offerId } });
      if (result.data) tradedToast(result.data.acceptHalloweenCandyOffer);
    } catch (e) {
      toast.error(errorMessage(e, "Could not take the offer"));
    } finally {
      setAcceptingId(null);
      void offers.refetch();
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
      offers={offers.data?.halloweenCandySwapOffers ?? null}
      myOffers={data.myHalloweenCandyOffers}
      trades={data.myHalloweenCandyTrades}
      maxOpenOffers={MAX_OPEN_OFFERS}
      onPlace={onPlace}
      onAccept={onAccept}
      onCancel={onCancel}
      onReroll={reroll}
      placing={placing}
      acceptingId={acceptingId}
      cancellingId={cancellingId}
      rerolling={rerolling}
    />
  );
};
