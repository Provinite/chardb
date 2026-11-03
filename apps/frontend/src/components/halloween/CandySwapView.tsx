import React, { useId, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Asterisk,
  CircleAlert,
  Plus,
  Shuffle,
} from "lucide-react";
import {
  Button,
  ButtonLink,
  Cluster,
  Dialog,
  Grid,
  Sidebar,
  Stack,
} from "@chardb/ui";
import type {
  CandySwapActivityFieldsFragment as SwapActivity,
  CandySwapCandyFieldsFragment as SwapCandy,
  CandySwapPlayerFieldsFragment as SwapPlayer,
  HalloweenCandyOfferFieldsFragment as SwapOffer,
  HalloweenCandySwapListingFieldsFragment as SwapListing,
  HalloweenCandySwapTradeFieldsFragment as PublicTrade,
  HalloweenCandyTradeFieldsFragment as SwapTrade,
} from "../../generated/graphql";
import { candyImageUrl, candyName } from "./candyBoard";
import { timeAgo } from "./timeAgo";
import * as styles from "./CandySwapView.css";

export interface CandySwapViewProps {
  candyTypes: readonly string[];
  /** Your candies that are not in an offer. */
  myCandies: SwapCandy[];
  /** Other players' open offers, the ones you can take first; null while they first load. */
  listings: SwapListing[] | null;
  /** How busy the swap is; null while it first loads. */
  activity: SwapActivity | null;
  /** The community's latest trades; null while they first load. */
  recentTrades: PublicTrade[] | null;
  /** The offers and counts could not be loaded, and none are on hand. */
  marketFailed: boolean;
  /** The recent swaps could not be loaded, and none are on hand. */
  recentFailed: boolean;
  /** What the trades' times are counted back from. */
  now: Date;
  myOffers: SwapOffer[];
  trades: SwapTrade[];
  maxOpenOffers: number;
  /** The most candies one offer may give. */
  maxOffered: number;
  /**
   * Resolves true once the offer is placed, so the form can clear. A null
   * `wantSlug` asks for any kind.
   */
  onPlace: (candyIds: number[], wantSlug: string | null) => Promise<boolean>;
  /** `giveSlug` is the kind picked to fill an offer for any kind. */
  onAccept: (offerId: string, giveSlug?: string) => void;
  onCancel: (offerId: string) => void;
  /** Draws a new sample of offers; also tries again after a failed load. */
  onReroll: () => void;
  onRetryRecent: () => void;
  placing: boolean;
  acceptingId: string | null;
  cancellingId: string | null;
  rerolling: boolean;
  /**
   * A link to where Discord is linked, shown when you have no candies. One
   * link element, such as a router `Link`, which is given a button's look.
   */
  noCandies?: React.ReactElement<{ className?: string }>;
}

/** Asking for any kind of candy. */
const ANYTHING = Symbol("anything");
/** What the offer being made asks for; null before anything is chosen. */
type Ask = string | typeof ANYTHING | null;

/** Which open offers are listed. */
type Filter = "takeable" | "all";

const LISTING_PLACEHOLDERS = 4;
const FEED_PLACEHOLDERS = 4;
/** How many of your own trades show before "Show all". */
const TRADES_SHOWN = 5;

const Candy = ({
  slug,
  small,
  decorative,
  lazy,
}: {
  slug: string;
  small?: boolean;
  /** Inside a control that names it, so it goes unannounced. */
  decorative?: boolean;
  /** For long lists, such as the pickers, that load as they scroll. */
  lazy?: boolean;
}) => (
  <img
    className={small ? styles.smallCandy : styles.candy}
    src={candyImageUrl(slug)}
    alt={decorative ? "" : candyName(slug)}
    loading={lazy ? "lazy" : undefined}
  />
);

/** Stands in for a candy where any kind will do. */
const AnythingMark = ({ label }: { label?: string }) => (
  <span
    className={styles.glyph}
    role={label ? "img" : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    <Asterisk className={styles.glyphIcon} aria-hidden />
  </span>
);

/** What an offer gives, and what it asks for. */
const OfferTerms = ({ offer }: { offer: SwapOffer }) => (
  <Cluster gap="sm">
    {offer.candies.map((c) => (
      <Candy key={c.id} slug={c.slug} />
    ))}
    <ArrowRight className={styles.arrow} aria-label="for" />
    {offer.wantSlug === null ? (
      <AnythingMark label="anything" />
    ) : (
      <Candy slug={offer.wantSlug} />
    )}
  </Cluster>
);

/** One choice in a picker dialog: a candy, or the mark for any kind. */
const Choice = ({
  label,
  have = 0,
  chosen,
  disabled,
  onPick,
  children,
}: {
  label: string;
  /** How many of it you hold, shown as a badge when any. */
  have?: number;
  /**
   * Whether it is the current choice, in a picker that keeps one. Left out
   * where picking acts at once, which is no toggle.
   */
  chosen?: boolean;
  disabled?: boolean;
  onPick: () => void;
  children: React.ReactNode;
}) => (
  <li>
    <button
      type="button"
      className={styles.pickCandy}
      aria-label={have ? `${label} (you have ${have})` : label}
      aria-pressed={chosen}
      data-autofocus={chosen ? "" : undefined}
      disabled={disabled}
      onClick={onPick}
    >
      {children}
      {have > 0 && (
        <span className={styles.count} aria-hidden>
          {have}
        </span>
      )}
    </button>
  </li>
);

/** A section named by its heading, so it is a landmark people can jump to. */
const Section = ({
  title,
  aside,
  className,
  children,
}: {
  title: string;
  /** Beside the heading: a count or controls. */
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => {
  const id = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={id} className={className}>
      <Cluster justify="space-between" gap="sm">
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        {aside}
      </Cluster>
      {children}
    </Stack>
  );
};

/** A sentence in place of a list with nothing in it. */
const Empty = ({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) => (
  <Stack gap="xs" className={styles.empty}>
    {title && <p className={styles.emptyTitle}>{title}</p>}
    {children && <p className={styles.muted}>{children}</p>}
  </Stack>
);

/** In place of a list that failed to load, with a way to try again. */
const LoadError = ({
  busy,
  onRetry,
  children,
}: {
  busy?: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) => (
  <Cluster gap="sm" justify="space-between" className={styles.loadError}>
    <p className={styles.loadErrorText}>
      <CircleAlert className={styles.loadErrorIcon} aria-hidden />
      {children}
    </p>
    <Button tone="outline" size="sm" busy={busy} onClick={onRetry}>
      Try again
    </Button>
  </Cluster>
);

const countBySlug = (candies: SwapCandy[]) => {
  const counts = new Map<string, number>();
  for (const c of candies) counts.set(c.slug, (counts.get(c.slug) ?? 0) + 1);
  return counts;
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** A player's name; a house offer's host, or a gone account, without one. */
const nameOf = (person: SwapPlayer | null, host?: string | null) =>
  person
    ? person.displayName || person.username
    : (host ?? "A deleted account");

export const CandySwapView = ({
  candyTypes,
  myCandies,
  listings,
  activity,
  recentTrades,
  now,
  myOffers,
  trades,
  maxOpenOffers,
  maxOffered,
  onPlace,
  onAccept,
  onCancel,
  onReroll,
  onRetryRecent,
  marketFailed,
  recentFailed,
  placing,
  acceptingId,
  cancellingId,
  rerolling,
  noCandies,
}: CandySwapViewProps) => {
  const [picked, setPicked] = useState<SwapCandy[]>([]);
  const [want, setWant] = useState<Ask>(null);
  const [picking, setPicking] = useState(false);
  /** The offer for any kind whose payment is being picked. */
  const [paying, setPaying] = useState<SwapOffer | null>(null);
  /** The list picked by hand; until then, the offers you can take if any. */
  const [chosenFilter, setFilter] = useState<Filter | null>(null);
  const [allTrades, setAllTrades] = useState(false);

  // Picked candies leave the tray; candies traded away since are dropped.
  const available = useMemo(
    () => new Map(myCandies.map((c) => [c.id, c])),
    [myCandies],
  );
  const offering = useMemo(
    () => picked.filter((c) => available.has(c.id)),
    [picked, available],
  );
  const tray = useMemo(() => {
    const taken = new Set(offering.map((c) => c.id));
    const groups = new Map<string, SwapCandy[]>();
    for (const c of myCandies) {
      if (taken.has(c.id)) {
        if (!groups.has(c.slug)) groups.set(c.slug, []);
        continue;
      }
      groups.set(c.slug, [...(groups.get(c.slug) ?? []), c]);
    }
    return [...groups].sort(([a], [b]) => a.localeCompare(b));
  }, [myCandies, offering]);
  const giving = new Set(offering.map((c) => c.slug));
  // Every candy you hold, including those in your open offers.
  const owned = useMemo(
    () => countBySlug([...myCandies, ...myOffers.flatMap((o) => o.candies)]),
    [myCandies, myOffers],
  );
  // The kinds you could pay with: candies not in an offer.
  const spares = useMemo(() => {
    const counts = countBySlug(myCandies);
    return candyTypes.flatMap((slug) => {
      const have = counts.get(slug);
      return have ? [[slug, have] as const] : [];
    });
  }, [candyTypes, myCandies]);

  const takeable = listings?.filter((l) => l.canTake) ?? [];
  // With nothing left to take, the list falls back to all, even when the
  // offers you could take were picked by hand.
  const filter: Filter =
    takeable.length === 0 ? "all" : (chosenFilter ?? "takeable");
  const shown = filter === "takeable" ? takeable : (listings ?? []);
  // The listings are a sample; this is how many there are to sample from.
  const outOf =
    filter === "takeable"
      ? (activity?.readyToTrade ?? 0)
      : (activity?.available ?? 0);

  const atLimit = myOffers.length >= maxOpenOffers;
  const full = offering.length >= maxOffered;
  const canPlace =
    !atLimit &&
    offering.length > 0 &&
    want !== null &&
    (want === ANYTHING || !giving.has(want));
  const noneToOffer = myCandies.length === 0 && myOffers.length === 0;

  const ask = (choice: Exclude<Ask, null>) => {
    // Picking the one asked for again stops asking.
    setWant(choice === want ? null : choice);
    setPicking(false);
  };

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPlace) return;
    if (
      await onPlace(
        offering.map((c) => c.id),
        want === ANYTHING ? null : want,
      )
    ) {
      setPicked([]);
      setWant(null);
    }
  };

  const filterButton = (value: Filter, label: string, count: number) => (
    <button
      type="button"
      className={styles.filterOption}
      aria-pressed={filter === value}
      disabled={count === 0}
      onClick={() => setFilter(value)}
    >
      {label} ({count})
    </button>
  );

  return (
    <Stack gap="lg" className={styles.page}>
      <Cluster
        as="header"
        gap="lg"
        justify="space-between"
        className={styles.hero}
      >
        <Stack gap="xs" className={styles.heroText}>
          <h1 className={styles.title}>
            <ArrowLeftRight className={styles.titleIcon} aria-hidden />
            Candy swap
          </h1>
          <p className={styles.heroLead}>
            Offer your spare candy for something specific, or browse offers from
            the community!
          </p>
        </Stack>
        <Cluster gap="lg" className={styles.stats} aria-busy={!activity}>
          <p className={styles.stat}>
            <span className={styles.statValue}>
              {activity ? activity.openOffers : "–"}
            </span>{" "}
            {activity?.openOffers === 1 ? "open offer" : "open offers"}
          </p>
          <p className={styles.stat}>
            <span className={styles.statValue}>
              {activity ? activity.tradesLastDay : "–"}
            </span>{" "}
            {activity?.tradesLastDay === 1
              ? "trade in the last day"
              : "trades in the last day"}
          </p>
        </Cluster>
      </Cluster>

      <Sidebar.Root stackBelow="lg">
        <Sidebar.Main>
          <Stack gap="xl">
            <Section
              title="Open offers"
              aside={
                <div
                  className={styles.filter}
                  role="group"
                  aria-label="Which offers"
                >
                  {filterButton(
                    "takeable",
                    "Ready to trade",
                    activity?.readyToTrade ?? 0,
                  )}
                  {filterButton("all", "All", activity?.available ?? 0)}
                </div>
              }
            >
              {/* Held in place, unseen, while the offers load. */}
              {((listings === null && !marketFailed) ||
                (listings !== null && listings.length > 0)) && (
                <Cluster
                  gap="sm"
                  className={listings === null ? styles.reserved : undefined}
                  aria-hidden={listings === null || undefined}
                >
                  <p className={styles.showing}>
                    Showing {shown.length} of {outOf}
                  </p>
                  <Button
                    tone="ghost"
                    size="sm"
                    busy={rerolling}
                    disabled={listings === null || shown.length >= outOf}
                    onClick={onReroll}
                  >
                    <Shuffle className={styles.buttonIcon} aria-hidden />
                    Shuffle
                  </Button>
                </Cluster>
              )}
              {marketFailed ? (
                <LoadError busy={rerolling} onRetry={onReroll}>
                  Couldn&apos;t load the open offers.
                </LoadError>
              ) : listings === null ? (
                <Grid min="lg" gap="md" aria-busy>
                  {Array.from({ length: LISTING_PLACEHOLDERS }, (_, i) => (
                    <div key={i} className={styles.placeholder} />
                  ))}
                </Grid>
              ) : listings.length === 0 ? (
                <Empty title="No one else has an open offer right now">
                  Yours are under Your open offers.
                </Empty>
              ) : (
                <Grid as="ul" min="lg" gap="md" className={styles.list}>
                  {shown.map(({ offer, canTake }) => (
                    <Stack
                      as="li"
                      key={offer.id}
                      gap="md"
                      className={canTake ? styles.card : styles.cardOut}
                    >
                      {offer.host && (
                        <span className={styles.offerFrom}>
                          {offer.host}&apos;s offer
                        </span>
                      )}
                      <OfferTerms offer={offer} />
                      <div className={styles.cardAction}>
                        {canTake ? (
                          <Button
                            busy={acceptingId === offer.id}
                            disabled={
                              acceptingId !== null && acceptingId !== offer.id
                            }
                            onClick={() =>
                              offer.wantSlug === null
                                ? setPaying(offer)
                                : onAccept(offer.id)
                            }
                          >
                            {offer.wantSlug === null
                              ? "Pick a candy to trade"
                              : `Trade your ${candyName(offer.wantSlug)}`}
                          </Button>
                        ) : (
                          <p className={styles.cannotTake}>
                            {offer.wantSlug === null ? (
                              "You have no candy it doesn't already give"
                            ) : (
                              <>
                                You don&apos;t have any{" "}
                                <img
                                  className={styles.inlineCandy}
                                  src={candyImageUrl(offer.wantSlug)}
                                  alt={candyName(offer.wantSlug)}
                                />{" "}
                                to trade
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </Stack>
                  ))}
                </Grid>
              )}
            </Section>

            <Dialog.Root
              open={paying !== null}
              onClose={() => setPaying(null)}
              closeOnScrimClick
              width="wide"
            >
              <Dialog.Title>Trade a candy</Dialog.Title>
              <Dialog.Body>
                <Cluster as="ul" gap="sm" className={styles.list}>
                  {spares.map(([slug, have]) => (
                    <Choice
                      key={slug}
                      label={candyName(slug)}
                      have={have}
                      disabled={paying?.candies.some((c) => c.slug === slug)}
                      onPick={() => {
                        if (paying) onAccept(paying.id, slug);
                        setPaying(null);
                      }}
                    >
                      <Candy slug={slug} decorative lazy />
                    </Choice>
                  ))}
                </Cluster>
              </Dialog.Body>
            </Dialog.Root>

            <Section title="Make an offer" className={styles.panel}>
              <Stack as="form" gap="lg" noValidate onSubmit={place}>
                <Cluster gap="md" align="flex-end">
                  <Stack gap="xs">
                    <p className={styles.label}>Giving</p>
                    <Cluster gap="sm">
                      {Array.from({ length: maxOffered }, (_, i) => {
                        const c = offering[i];
                        return c ? (
                          <button
                            key={c.id}
                            type="button"
                            className={styles.filledSlot}
                            aria-label={`Remove ${candyName(c.slug)}`}
                            onClick={() =>
                              setPicked((p) => p.filter((x) => x.id !== c.id))
                            }
                          >
                            <Candy slug={c.slug} decorative />
                          </button>
                        ) : (
                          <span key={`empty-${i}`} className={styles.slot}>
                            <span className={styles.candy} />
                          </span>
                        );
                      })}
                    </Cluster>
                  </Stack>
                  <ArrowRight className={styles.composeArrow} aria-hidden />
                  <Stack gap="xs">
                    <p className={styles.label}>Asking for</p>
                    <button
                      type="button"
                      className={want ? styles.filledSlot : styles.slotButton}
                      aria-label={
                        want === null
                          ? "Choose a candy to ask for"
                          : `Asking for ${want === ANYTHING ? "anything" : candyName(want)}`
                      }
                      onClick={() => setPicking(true)}
                    >
                      {want === null ? (
                        <span className={styles.glyph}>
                          <Plus className={styles.glyphIcon} aria-hidden />
                        </span>
                      ) : want === ANYTHING ? (
                        <AnythingMark />
                      ) : (
                        <Candy slug={want} decorative />
                      )}
                    </button>
                  </Stack>
                </Cluster>

                <Stack gap="xs">
                  <p className={styles.label}>Your candies</p>
                  {tray.length === 0 ? (
                    <Stack gap="sm" className={styles.empty}>
                      <p className={styles.emptyTitle}>
                        {noneToOffer
                          ? "You have no candies yet"
                          : "Every candy of yours is in an offer"}
                      </p>
                      <p className={styles.muted}>
                        {noneToOffer
                          ? "Knock on Discord to collect some, then trade them here."
                          : "Cancel an offer to use its candies in another."}
                      </p>
                      {noneToOffer && noCandies && (
                        <Cluster>
                          <ButtonLink tone="outline" size="sm">
                            {noCandies}
                          </ButtonLink>
                        </Cluster>
                      )}
                    </Stack>
                  ) : (
                    <Cluster as="ul" gap="sm" className={styles.list}>
                      {tray.map(([slug, left]) => (
                        <li key={slug}>
                          <button
                            type="button"
                            className={styles.trayCandy}
                            aria-label={`Add ${candyName(slug)} (${left.length} left)`}
                            disabled={
                              left.length === 0 || full || slug === want
                            }
                            onClick={() => setPicked((p) => [...p, left[0]])}
                          >
                            <Candy slug={slug} decorative />
                            <span className={styles.count} aria-hidden>
                              {left.length}
                            </span>
                          </button>
                        </li>
                      ))}
                    </Cluster>
                  )}
                </Stack>

                <Dialog.Root
                  open={picking}
                  onClose={() => setPicking(false)}
                  closeOnScrimClick
                  width="wide"
                >
                  <Dialog.Title>Ask for a candy</Dialog.Title>
                  <Dialog.Body>
                    <Cluster as="ul" gap="sm" className={styles.list}>
                      <Choice
                        label="Anything"
                        chosen={want === ANYTHING}
                        onPick={() => ask(ANYTHING)}
                      >
                        <AnythingMark />
                      </Choice>
                      {candyTypes.map((slug) => (
                        <Choice
                          key={slug}
                          label={candyName(slug)}
                          have={owned.get(slug)}
                          chosen={slug === want}
                          disabled={giving.has(slug)}
                          onPick={() => ask(slug)}
                        >
                          <Candy slug={slug} decorative lazy />
                        </Choice>
                      ))}
                    </Cluster>
                  </Dialog.Body>
                </Dialog.Root>

                <Cluster gap="md" className={styles.panelFooter}>
                  <Button type="submit" busy={placing} disabled={!canPlace}>
                    Place offer
                  </Button>
                  <p className={styles.muted}>
                    {atLimit
                      ? `${maxOpenOffers} open ${maxOpenOffers === 1 ? "offer is" : "offers is"} the most you can have. Cancel one to make another.`
                      : "Your candies are held until someone takes the offer or you cancel it."}
                  </p>
                </Cluster>
              </Stack>
            </Section>
          </Stack>
        </Sidebar.Main>

        <Sidebar.Side width="xl">
          <Stack gap="xl">
            <Section
              title="Your open offers"
              aside={
                <span className={styles.tally}>
                  {myOffers.length} of {maxOpenOffers}
                </span>
              }
            >
              {myOffers.length === 0 ? (
                <Empty>
                  Offers you put up wait here until someone takes them.
                </Empty>
              ) : (
                <Stack as="ul" gap="sm" className={styles.list}>
                  {myOffers.map((offer) => (
                    <Cluster
                      as="li"
                      key={offer.id}
                      gap="sm"
                      justify="space-between"
                      className={styles.row}
                    >
                      <OfferTerms offer={offer} />
                      <Button
                        tone="outline"
                        size="sm"
                        busy={cancellingId === offer.id}
                        aria-label={`Cancel offer for ${offer.wantSlug === null ? "anything" : candyName(offer.wantSlug)}`}
                        onClick={() => onCancel(offer.id)}
                      >
                        Cancel
                      </Button>
                    </Cluster>
                  ))}
                </Stack>
              )}
            </Section>

            <Section title="Recent swaps">
              {recentFailed ? (
                <LoadError onRetry={onRetryRecent}>
                  Couldn&apos;t load the recent swaps.
                </LoadError>
              ) : recentTrades === null ? (
                <Stack gap="sm" aria-busy>
                  {Array.from({ length: FEED_PLACEHOLDERS }, (_, i) => (
                    <div key={i} className={styles.rowPlaceholder} />
                  ))}
                </Stack>
              ) : recentTrades.length === 0 ? (
                <Empty>No swaps yet.</Empty>
              ) : (
                <Stack as="ul" gap="sm" className={styles.list}>
                  {recentTrades.map((t) => (
                    <Stack as="li" key={t.id} gap="xs" className={styles.row}>
                      <p className={styles.feedNames}>
                        <span className={styles.name}>
                          {nameOf(t.offerer, t.host)}
                        </span>
                        <ArrowLeftRight
                          className={styles.feedIcon}
                          aria-label="swapped with"
                        />
                        <span className={styles.name}>{nameOf(t.taker)}</span>
                      </p>
                      <Cluster gap="xs">
                        {t.offered.map((slug, i) => (
                          <Candy key={`o-${slug}-${i}`} slug={slug} small />
                        ))}
                        <ArrowRight className={styles.arrow} aria-label="for" />
                        {t.paid.map((slug, i) => (
                          <Candy key={`p-${slug}-${i}`} slug={slug} small />
                        ))}
                        <span className={styles.time}>
                          {timeAgo(t.createdAt, now)}
                        </span>
                      </Cluster>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Section>

            <Section title="Your trades">
              {trades.length === 0 ? (
                <Empty>Your swaps, and whom they were with, show here.</Empty>
              ) : (
                <Stack gap="sm">
                  <Stack as="ul" gap="sm" className={styles.list}>
                    {(allTrades ? trades : trades.slice(0, TRADES_SHOWN)).map(
                      (t) => (
                        <Stack
                          as="li"
                          key={t.id}
                          gap="xs"
                          className={styles.row}
                        >
                          <Cluster gap="xs" justify="space-between">
                            <span className={styles.name}>
                              {nameOf(t.with, t.host)}
                            </span>
                            <span className={styles.time}>
                              {timeAgo(t.createdAt, now)}
                            </span>
                          </Cluster>
                          <Cluster gap="xs">
                            <span className={styles.label}>You gave</span>
                            {t.gave.map((slug, i) => (
                              <Candy key={`${slug}-${i}`} slug={slug} small />
                            ))}
                            <span className={styles.label}>You got</span>
                            {t.received.map((slug, i) => (
                              <Candy key={`${slug}-${i}`} slug={slug} small />
                            ))}
                          </Cluster>
                        </Stack>
                      ),
                    )}
                  </Stack>
                  {trades.length > TRADES_SHOWN && (
                    <Cluster>
                      <Button
                        tone="ghost"
                        size="sm"
                        aria-expanded={allTrades}
                        onClick={() => setAllTrades((v) => !v)}
                      >
                        {allTrades
                          ? "Show fewer"
                          : `Show all ${plural(trades.length, "trade", "trades")}`}
                      </Button>
                    </Cluster>
                  )}
                </Stack>
              )}
            </Section>
          </Stack>
        </Sidebar.Side>
      </Sidebar.Root>
    </Stack>
  );
};
