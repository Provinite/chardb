import React, { useId, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button, Cluster, Dialog, Grid, Stack } from "@chardb/ui";
import { candyImageUrl, candyName } from "./candyBoard";
import * as styles from "./CandySwapView.css";

export interface SwapCandy {
  id: number;
  slug: string;
}

export interface SwapOffer {
  id: string;
  wantSlug: string;
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
  /** Resolves true once the offer is placed, so the form can clear. */
  onPlace: (candyIds: number[], wantSlug: string) => Promise<boolean>;
  onAccept: (offerId: string) => void;
  onCancel: (offerId: string) => void;
  onReroll: () => void;
  placing: boolean;
  acceptingId: string | null;
  cancellingId: string | null;
  rerolling: boolean;
  /** Shown after the empty tray's note: where to link Discord. */
  noCandies?: React.ReactNode;
}

const Candy = ({ slug, small }: { slug: string; small?: boolean }) => (
  <img
    className={small ? styles.smallCandy : styles.candy}
    src={candyImageUrl(slug)}
    alt={candyName(slug)}
  />
);

/** What an offer gives, and what it asks for. */
const OfferTerms = ({ offer }: { offer: SwapOffer }) => (
  <Cluster gap="sm">
    {offer.candies.map((c) => (
      <Candy key={c.id} slug={c.slug} />
    ))}
    <ArrowRight aria-label="for" />
    <Candy slug={offer.wantSlug} />
  </Cluster>
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
  const [want, setWant] = useState("");
  const [picking, setPicking] = useState(false);

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
  const owned = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of myCandies) counts.set(c.slug, (counts.get(c.slug) ?? 0) + 1);
    return counts;
  }, [myCandies]);

  const atLimit = myOffers.length >= maxOpenOffers;
  const full = offering.length >= maxOffered;
  const canPlace =
    !atLimit && offering.length > 0 && want !== "" && !giving.has(want);

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPlace) return;
    if (
      await onPlace(
        offering.map((c) => c.id),
        want,
      )
    ) {
      setPicked([]);
      setWant("");
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
                  onClick={() => onAccept(offer.id)}
                >
                  Trade your {candyName(offer.wantSlug)}
                </Button>
              </Stack>
            ))}
          </Grid>
        )}
      </Section>

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
                    <img
                      className={styles.candy}
                      src={candyImageUrl(c.slug)}
                      alt=""
                    />
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
                      <img
                        className={styles.candy}
                        src={candyImageUrl(slug)}
                        alt=""
                      />
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
                  want
                    ? `Asking for ${candyName(want)}`
                    : "Choose a candy to ask for"
                }
                onClick={() => setPicking(true)}
              >
                {want ? (
                  <img
                    className={styles.candy}
                    src={candyImageUrl(want)}
                    alt=""
                  />
                ) : (
                  <span className={styles.plus}>
                    <Plus className={styles.plusIcon} aria-hidden />
                  </span>
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
                {candyTypes.map((slug) => {
                  const have = owned.get(slug) ?? 0;
                  const name = candyName(slug);
                  return (
                    <li key={slug}>
                      <button
                        type="button"
                        className={styles.pickCandy}
                        aria-label={have ? `${name} (you have ${have})` : name}
                        aria-pressed={slug === want}
                        disabled={giving.has(slug)}
                        onClick={() => {
                          setWant(slug);
                          setPicking(false);
                        }}
                      >
                        <img
                          className={styles.candy}
                          src={candyImageUrl(slug)}
                          alt=""
                          loading="lazy"
                        />
                        {have > 0 && (
                          <span className={styles.count} aria-hidden>
                            {have}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
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
                  aria-label={`Cancel offer for ${candyName(offer.wantSlug)}`}
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
