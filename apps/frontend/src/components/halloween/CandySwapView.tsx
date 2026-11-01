import React, { useId, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button, Cluster, Grid, Stack } from "@chardb/ui";
import { candyImageUrl, candyName } from "./candyBoard";
import * as styles from "./CandySwapView.css";

/** The most candies one offer gives. Mirrors the backend's limit. */
export const MAX_OFFERED = 3;

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
  /** Resolves true once the offer is placed, so the form can clear. */
  onPlace: (candyIds: number[], wantSlug: string) => Promise<boolean>;
  onAccept: (offerId: string) => void;
  onCancel: (offerId: string) => void;
  onReroll: () => void;
  placing: boolean;
  acceptingId: string | null;
  cancellingId: string | null;
  rerolling: boolean;
}

const Candy = ({ slug, small }: { slug: string; small?: boolean }) => (
  <img
    className={small ? styles.smallCandy : styles.candy}
    src={candyImageUrl(slug)}
    alt={candyName(slug)}
  />
);

const NamedCandy = ({ slug }: { slug: string }) => (
  <span className={styles.namedCandy}>
    <img className={styles.candy} src={candyImageUrl(slug)} alt="" />
    {candyName(slug)}
  </span>
);

/** What an offer gives, and what it asks for. */
const OfferTerms = ({ offer }: { offer: SwapOffer }) => (
  <Cluster gap="sm">
    {offer.candies.map((c) => (
      <NamedCandy key={c.id} slug={c.slug} />
    ))}
    <ArrowRight aria-label="for" />
    <NamedCandy slug={offer.wantSlug} />
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
  onPlace,
  onAccept,
  onCancel,
  onReroll,
  placing,
  acceptingId,
  cancellingId,
  rerolling,
}: CandySwapViewProps) => {
  const [picked, setPicked] = useState<SwapCandy[]>([]);
  const [want, setWant] = useState("");
  const wantId = useId();

  // Picked candies leave the tray; candies traded away since are dropped.
  const available = useMemo(
    () => new Map(myCandies.map((c) => [c.id, c])),
    [myCandies],
  );
  const offering = picked.filter((c) => available.has(c.id));
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

  const atLimit = myOffers.length >= maxOpenOffers;
  const full = offering.length >= MAX_OFFERED;
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
          Offer up to three candies for one you want. Who you traded with shows
          once a trade goes through.
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
              {Array.from({ length: MAX_OFFERED }, (_, i) => {
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
                You have no candies to offer. Knocking on Discord gives them,
                once your Discord account is linked.
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
            <label htmlFor={wantId} className={styles.label}>
              Asking for
            </label>
            <Cluster gap="sm">
              <select
                id={wantId}
                className={styles.select}
                value={want}
                onChange={(e) => setWant(e.target.value)}
              >
                <option value="">Choose a candy</option>
                {candyTypes.map((slug) => (
                  <option key={slug} value={slug} disabled={giving.has(slug)}>
                    {candyName(slug)}
                  </option>
                ))}
              </select>
              <span className={styles.slot}>
                {want ? (
                  <img
                    className={styles.candy}
                    src={candyImageUrl(want)}
                    alt=""
                  />
                ) : (
                  <span className={styles.candy} />
                )}
              </span>
            </Cluster>
          </Stack>

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
                  tone="secondary"
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
