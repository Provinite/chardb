import React, { useId } from "react";
import { Gift } from "lucide-react";
import { Grid, Sidebar, Stack } from "@chardb/ui";
import * as styles from "./PrizeListView.css";

export interface PrizeListing {
  id: string;
  name: string;
  image?: string | null;
  initialStock: number;
  currentStock: number;
  itemTypeId?: string | null;
  characterId?: string | null;
}

export type WinnerKind = "MEMBER" | "DISCORD" | "ANONYMOUS";

export interface PublicWin {
  id: number;
  time: string;
  prize: PrizeListing;
  /** Already narrowed by the server to what this viewer may see. */
  winner: { kind: WinnerKind; displayName: string; url?: string | null };
}

export interface PrizeLinkProps {
  to: string;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}

export interface PrizeListViewProps {
  /** Null while loading. */
  prizes: PrizeListing[] | null;
  /** Null while loading. */
  wins: PublicWin[] | null;
  /** What the wins' times are counted back from. */
  now: Date;
  /** Renders a link to a page on this site. */
  LinkComponent: React.ComponentType<PrizeLinkProps>;
}

const PRIZE_PLACEHOLDERS = 6;
const WIN_PLACEHOLDERS = 5;

const placeholders = (n: number, className: string) =>
  Array.from({ length: n }, (_, i) => (
    <li key={i} className={className} aria-hidden="true" />
  ));

const chardbPath = (prize: PrizeListing): string | null =>
  prize.itemTypeId
    ? `/item-types/${prize.itemTypeId}`
    : prize.characterId
      ? `/character/${prize.characterId}`
      : null;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "always" });

/** "5 minutes ago", "2 days ago"; "just now" under a minute. */
const timeAgo = (iso: string, now: Date): string => {
  const seconds = Math.max(0, (now.getTime() - Date.parse(iso)) / 1000);
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return relativeTime.format(-Math.floor(seconds / size), unit);
    }
  }
  return "just now";
};

const PrizePicture: React.FC<{ prize: PrizeListing; won: boolean }> = ({
  prize,
  won,
}) =>
  prize.image ? (
    <img
      src={prize.image}
      alt={prize.name}
      loading="lazy"
      className={
        won ? `${styles.picture} ${styles.pictureWon}` : styles.picture
      }
    />
  ) : (
    <div className={styles.noPicture}>
      <Gift className={styles.noPictureIcon} aria-hidden="true" />
    </div>
  );

const PrizeCard: React.FC<{
  prize: PrizeListing;
  LinkComponent: React.ComponentType<PrizeLinkProps>;
}> = ({ prize, LinkComponent }) => {
  const won = prize.currentStock <= 0;
  const path = chardbPath(prize);
  return (
    <li className={styles.card}>
      <PrizePicture prize={prize} won={won} />
      <Stack gap="xs" className={styles.cardBody}>
        <h3 className={styles.prizeName}>{prize.name}</h3>
        {won ? (
          <p className={styles.allWon}>All won</p>
        ) : (
          <p className={styles.stock}>
            {prize.currentStock} of {prize.initialStock} left
          </p>
        )}
        {path && (
          <LinkComponent
            to={path}
            className={styles.link}
            aria-label={`View ${prize.name} on chardb`}
          >
            View on chardb
          </LinkComponent>
        )}
      </Stack>
    </li>
  );
};

const Winner: React.FC<{
  winner: PublicWin["winner"];
  LinkComponent: React.ComponentType<PrizeLinkProps>;
}> = ({ winner, LinkComponent }) => {
  if (winner.kind === "MEMBER" && winner.url) {
    return (
      <LinkComponent to={winner.url} className={styles.link}>
        {winner.displayName}
      </LinkComponent>
    );
  }
  if (winner.kind === "DISCORD" && winner.url) {
    return (
      <a
        href={winner.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        {winner.displayName}
      </a>
    );
  }
  return <span>{winner.displayName}</span>;
};

/**
 * The Halloween prize list: every prize in the pool with how many are left,
 * beside the latest wins.
 */
export const PrizeListView: React.FC<PrizeListViewProps> = ({
  prizes,
  wins,
  now,
  LinkComponent,
}) => {
  const prizesId = useId();
  const winsId = useId();
  return (
    <Stack gap="lg" className={styles.page}>
      <Stack gap="xs">
        <h1 className={styles.title}>Halloween prizes</h1>
        <p className={styles.muted}>
          Knock on Discord for a chance at one of these.
        </p>
      </Stack>
      <Sidebar.Root stackBelow="lg">
        <Sidebar.Main as="section" aria-labelledby={prizesId}>
          <Stack gap="md" className={styles.prizesSection}>
            <h2 id={prizesId} className={styles.sectionTitle}>
              Prizes
            </h2>
            {prizes?.length === 0 ? (
              <p className={styles.muted}>No prizes yet.</p>
            ) : (
              <Grid
                as="ul"
                min="md"
                gap="md"
                className={styles.list}
                aria-labelledby={prizesId}
                aria-busy={prizes === null}
              >
                {prizes === null
                  ? placeholders(PRIZE_PLACEHOLDERS, styles.cardPlaceholder)
                  : prizes.map((prize) => (
                      <PrizeCard
                        key={prize.id}
                        prize={prize}
                        LinkComponent={LinkComponent}
                      />
                    ))}
              </Grid>
            )}
          </Stack>
        </Sidebar.Main>
        <Sidebar.Side as="section" width="xl" aria-labelledby={winsId}>
          <Stack gap="md">
            <h2 id={winsId} className={styles.sectionTitle}>
              Recent wins
            </h2>
            {wins?.length === 0 ? (
              <p className={styles.muted}>No wins yet.</p>
            ) : (
              <Stack
                as="ul"
                gap="sm"
                className={styles.list}
                aria-labelledby={winsId}
                aria-busy={wins === null}
              >
                {wins === null
                  ? placeholders(WIN_PLACEHOLDERS, styles.winPlaceholder)
                  : wins.map((w) => (
                      <li key={w.id} className={styles.win}>
                        {w.prize.image ? (
                          <img
                            src={w.prize.image}
                            alt=""
                            loading="lazy"
                            className={styles.winPicture}
                          />
                        ) : (
                          <div className={styles.winPicture} />
                        )}
                        <div className={styles.winText}>
                          <p className={styles.winPrize}>{w.prize.name}</p>
                          <p className={styles.winDetail}>
                            <Winner
                              winner={w.winner}
                              LinkComponent={LinkComponent}
                            />
                            {" · "}
                            <time dateTime={w.time}>
                              {timeAgo(w.time, now)}
                            </time>
                          </p>
                        </div>
                      </li>
                    ))}
              </Stack>
            )}
          </Stack>
        </Sidebar.Side>
      </Sidebar.Root>
    </Stack>
  );
};
