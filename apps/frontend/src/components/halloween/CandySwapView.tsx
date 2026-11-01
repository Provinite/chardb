import React, { useId, useMemo, useState } from "react";
import { ArrowRight, Asterisk, Plus } from "lucide-react";
import { Button, Cluster, Dialog, Grid, Stack } from "@chardb/ui";
import { candyImageUrl, candyName } from "./candyBoard";
import * as styles from "./CandySwapView.css";

export interface SwapCandy {
  id: number;
  slug: string;
}

export interface SwapOffer {
  id: string;
  /** Null when any kind of candy will do. */
  wantSlug: string | null;
  candies: SwapCandy[];
}

export interface SwapTrade {
  id: string;
  with: { username: string; displayName?: string | null } | null;
  gave: string[];
  received: string[];
  createdAt: string;
}

export interface CandySwapViewProps {
  candyTypes: readonly string[];
  /** Your candies that are not in an offer. */
  myCandies: SwapCandy[];
  /** Offers you can take; null while they first load. */
  offers: SwapOffer[] | null;
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
  onReroll: () => void;
  placing: boolean;
  acceptingId: string | null;
  cancellingId: string | null;
  rerolling: boolean;
  /** Shown after the empty tray's note: where to link Discord. */
  noCandies?: React.ReactNode;
}

/** Asking for any kind of candy. */
const ANYTHING = Symbol("anything");
/** What the offer being made asks for; null before anything is chosen. */
type Ask = string | typeof ANYTHING | null;

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
    <ArrowRight aria-label="for" />
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
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => {
  const id = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={id}>
      <Cluster justify="space-between">
        <h2 id={id} className={styles.sectionTitle}>
          {title}
        </h2>
        {action}
      </Cluster>
      {children}
    </Stack>
  );
};

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const countBySlug = (candies: SwapCandy[]) => {
  const counts = new Map<string, number>();
  for (const c of candies) counts.set(c.slug, (counts.get(c.slug) ?? 0) + 1);
  return counts;
};

export const CandySwapView = ({
  candyTypes,
  myCandies,
  offers,
  myOffers,
  trades,
  maxOpenOffers,
  maxOffered,
  onPlace,
  onAccept,
  onCancel,
  onReroll,
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

  const atLimit = myOffers.length >= maxOpenOffers;
  const full = offering.length >= maxOffered;
  const canPlace =
    !atLimit &&
    offering.length > 0 &&
    want !== null &&
    (want === ANYTHING || !giving.has(want));

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

  return (
    <Stack gap="xl" className={styles.page}>
      <Stack gap="xs">
        <h1 className={styles.title}>Candy swap</h1>
        <p className={styles.muted}>
          Offer up to {maxOffered} candies for one you want. Who you traded with
          shows once a trade goes through.
        </p>
      </Stack>

      <Section
        title="Offers you can take"
        action={
          <Button tone="ghost" size="sm" busy={rerolling} onClick={onReroll}>
            Show others
          </Button>
        }
      >
        {offers === null ? (
          <Grid min="lg" gap="md">
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.placeholder} />
            ))}
          </Grid>
        ) : offers.length === 0 ? (
          <p className={styles.muted}>No offers you can take right now.</p>
        ) : (
          <Grid as="ul" min="lg" gap="md" className={styles.list}>
            {offers.map((offer) => (
              <Stack as="li" key={offer.id} gap="md" className={styles.card}>
                <OfferTerms offer={offer} />
                <Button
                  busy={acceptingId === offer.id}
                  disabled={acceptingId !== null && acceptingId !== offer.id}
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

      <Section title="Make an offer">
        <Stack as="form" gap="md" noValidate onSubmit={place}>
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

          <Stack gap="xs">
            <p className={styles.label}>Your candies</p>
            {tray.length === 0 ? (
              <p className={styles.muted}>
                You have no candies to offer. Knock on Discord to collect some.{" "}
                {noCandies}
              </p>
            ) : (
              <Cluster as="ul" gap="sm" className={styles.list}>
                {tray.map(([slug, left]) => (
                  <li key={slug}>
                    <button
                      type="button"
                      className={styles.trayCandy}
                      aria-label={`Add ${candyName(slug)} (${left.length} left)`}
                      disabled={left.length === 0 || full || slug === want}
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

          <Stack gap="xs">
            <p className={styles.label}>Asking for</p>
            <Cluster gap="sm">
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
            </Cluster>
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

          <Cluster gap="md">
            <Button type="submit" busy={placing} disabled={!canPlace}>
              Place offer
            </Button>
            <p className={styles.muted}>
              {atLimit
                ? `${maxOpenOffers} open ${maxOpenOffers === 1 ? "offer is" : "offers is"} the most you can have. Cancel one to make another.`
                : `${myOffers.length} of ${maxOpenOffers} open offers`}
            </p>
          </Cluster>
        </Stack>
      </Section>

      <Section title="Your open offers">
        {myOffers.length === 0 ? (
          <p className={styles.muted}>You have no open offers.</p>
        ) : (
          <Stack as="ul" gap="sm" className={styles.list}>
            {myOffers.map((offer) => (
              <Cluster
                as="li"
                key={offer.id}
                gap="md"
                justify="space-between"
                className={styles.card}
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

      <Section title="Your trades">
        {trades.length === 0 ? (
          <p className={styles.muted}>You haven't traded any candies yet.</p>
        ) : (
          <Stack as="ul" gap="sm" className={styles.list}>
            {trades.map((t) => (
              <Stack as="li" key={t.id} gap="xs" className={styles.card}>
                <Cluster gap="xs">
                  <span className={styles.tradeWith}>
                    {t.with
                      ? t.with.displayName || t.with.username
                      : "A deleted account"}
                  </span>
                  <span className={styles.muted}>
                    {dateFormat.format(new Date(t.createdAt))}
                  </span>
                </Cluster>
                <Cluster gap="sm">
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
            ))}
          </Stack>
        )}
      </Section>
    </Stack>
  );
};
