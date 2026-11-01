import React, { useDeferredValue, useMemo, useState } from "react";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { Button, Cluster, Grid, Stack } from "@chardb/ui";
import { candyImageUrl } from "./candyBoard";
import {
  bucketWidth,
  DEFAULT_GIFTY_SEND_RATE,
  DEFAULT_PLAYERS_PER_DAY,
  drawPrize,
  forecastRunOut,
  forecastRuns,
  giftySendRate,
  type PeriodStats,
  histogram,
  quantile,
  simulateKnock,
  type SimulatedKnock,
} from "./eventSimulation";
import * as styles from "./HalloweenEventInsights.css";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Gifties sent per player in a period, or null with no players. */
const giftiesPerPlayer = (period: PeriodStats | null): number | null =>
  period && period.players > 0 ? period.giftiesSent / period.players : null;

export interface EventSummary {
  knocks: number;
  wins: number;
  players: number;
  giftiesSent: number;
  toDeliver: number;
  unspentGifties: number;
  last24Hours: PeriodStats;
  today: PeriodStats | null;
  yesterday: PeriodStats | null;
}

export interface SimulatedPrize {
  id: string;
  name: string;
  initialStock: number;
  currentStock: number;
  weight: number;
  image?: string | null;
}

const sum = (
  prizes: readonly SimulatedPrize[],
  key: "initialStock" | "currentStock",
) => prizes.reduce((total, p) => total + p[key], 0);

const percent = (share: number) => `${Math.round(share * 100)}%`;

const Stat: React.FC<{ value: React.ReactNode; label: string }> = ({
  value,
  label,
}) => (
  <li className={styles.card}>
    <p className={styles.statValue}>{value}</p>
    <p className={styles.statLabel}>{label}</p>
  </li>
);

export interface HalloweenEventStatsProps {
  summary: EventSummary;
  prizes: readonly SimulatedPrize[];
}

/** The event's running totals, and how the last day went. */
export const HalloweenEventStats: React.FC<HalloweenEventStatsProps> = ({
  summary,
  prizes,
}) => {
  const sendToday = giftySendRate(summary.today);
  const sendYesterday = giftySendRate(summary.yesterday);
  return (
    <Grid
      as="ul"
      min="sm"
      gap="sm"
      className={styles.statList}
      data-testid="halloween-summary"
    >
      <Stat value={summary.knocks} label="Knocks" />
      <Stat value={summary.wins} label="Wins" />
      <Stat value={sum(prizes, "initialStock")} label="Prizes at start" />
      <Stat value={sum(prizes, "currentStock")} label="Prizes left" />
      <Stat value={summary.last24Hours.players} label="Players, last 24h" />
      <Stat value={summary.players} label="Players, all time" />
      <Stat value={summary.giftiesSent} label="Gifties sent" />
      <Stat value={summary.unspentGifties} label="Gifties unspent" />
      <Stat
        value={sendToday === null ? "–" : percent(sendToday)}
        label="Players sending gifties today"
      />
      <Stat
        value={sendYesterday === null ? "–" : percent(sendYesterday)}
        label="Players sending gifties yesterday"
      />
      <Stat value={summary.toDeliver} label="To deliver" />
    </Grid>
  );
};

/** A candy's slug as words: `candy-corn` is "Candy corn". */
const candyName = (slug: string) => {
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const PrizeResult: React.FC<{ prize: SimulatedPrize }> = ({ prize }) => (
  <Cluster gap="md" align="center">
    {prize.image ? (
      <img
        className={styles.resultImage}
        src={prize.image}
        alt=""
        width={64}
        height={64}
      />
    ) : null}
    <Stack gap="xs">
      <p className={styles.resultTitle}>{prize.name}</p>
      <p className={styles.muted}>
        {prize.currentStock} of {prize.initialStock} left
      </p>
    </Stack>
  </Cluster>
);

const KnockResult: React.FC<{
  knock: SimulatedKnock<SimulatedPrize>;
  winRate: number;
}> = ({ knock, winRate }) => {
  if (knock.kind === "outOfPrizes") {
    return <p className={styles.resultTitle}>Out of prizes: /knock refuses</p>;
  }
  const rolled = (
    <p className={styles.muted}>
      Rolled {knock.roll.toFixed(4)} against a win rate of {winRate.toFixed(4)}
    </p>
  );
  if (knock.kind === "win") {
    return (
      <Stack gap="xs">
        <p className={styles.resultTitle}>Winner</p>
        <PrizeResult prize={knock.prize} />
        {rolled}
      </Stack>
    );
  }
  return (
    <Stack gap="xs">
      <p className={styles.resultTitle}>No one was home</p>
      {knock.candySlug ? (
        <Cluster gap="md" align="center">
          <img
            className={styles.resultImage}
            src={candyImageUrl(knock.candySlug)}
            alt=""
            width={64}
            height={64}
          />
          <p className={styles.resultTitle}>{candyName(knock.candySlug)}</p>
        </Cluster>
      ) : (
        <p className={styles.muted}>No candies are known to give</p>
      )}
      {rolled}
    </Stack>
  );
};

export interface HalloweenSimulatorsProps {
  prizes: readonly SimulatedPrize[];
  winRate: number;
  candySlugs: readonly string[];
}

/**
 * A knock and a prize draw, rolled in the browser as `/knock` rolls them
 * against the pool as it stands. Nothing is taken or saved.
 */
export const HalloweenSimulators: React.FC<HalloweenSimulatorsProps> = ({
  prizes,
  winRate,
  candySlugs,
}) => {
  const [drawn, setDrawn] = useState<SimulatedPrize | null | undefined>();
  const [knock, setKnock] = useState<SimulatedKnock<SimulatedPrize>>();
  return (
    <Grid min="lg" gap="md">
      <Stack as="section" gap="sm" className={styles.card}>
        <h3 className={styles.sectionTitle}>Prize draw</h3>
        <p className={styles.muted}>A prize a win could take right now.</p>
        <div className={styles.result} aria-live="polite">
          {drawn === undefined ? null : drawn === null ? (
            <p className={styles.resultTitle}>No prizes left</p>
          ) : (
            <PrizeResult prize={drawn} />
          )}
        </div>
        <Cluster>
          <Button
            tone="secondary"
            size="sm"
            onClick={() => setDrawn(drawPrize(prizes, Math.random))}
          >
            Draw a prize
          </Button>
        </Cluster>
      </Stack>
      <Stack as="section" gap="sm" className={styles.card}>
        <h3 className={styles.sectionTitle}>Knock</h3>
        <p className={styles.muted}>
          A knock at today&apos;s win rate: a prize or a candy.
        </p>
        <div className={styles.result} aria-live="polite">
          {knock ? <KnockResult knock={knock} winRate={winRate} /> : null}
        </div>
        <Cluster>
          <Button
            tone="secondary"
            size="sm"
            onClick={() =>
              setKnock(simulateKnock(prizes, winRate, candySlugs, Math.random))
            }
          >
            Knock
          </Button>
        </Cluster>
      </Stack>
    </Grid>
  );
};

const days = (n: number) => `${n.toFixed(1)} days`;

/** A number typed into a field, or the fallback if it is not one. */
const parsed = (text: string, fallback: number) => {
  const n = Number(text);
  return text.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
};

export interface HalloweenRunOutForecastProps {
  prizes: readonly SimulatedPrize[];
  winRate: number;
  knocksPerDay: number;
  last24Hours: PeriodStats;
  yesterday: PeriodStats | null;
  startDate: string | null;
  endDate: string | null;
  now: Date;
}

/**
 * When the prizes run out, rolled thousands of times at a steady rate of
 * knocks from the start (or now, once started), as a histogram of days from
 * now. The inputs start from the last 24 hours and can be changed to try
 * other win rates and crowds.
 */
export const HalloweenRunOutForecast: React.FC<
  HalloweenRunOutForecastProps
> = ({
  prizes,
  winRate,
  knocksPerDay,
  last24Hours,
  yesterday,
  startDate,
  endDate,
  now,
}) => {
  const measured = last24Hours.players > 0;
  const defaults = {
    winRatePct: String(+(winRate * 100).toFixed(4)),
    players: String(measured ? last24Hours.players : DEFAULT_PLAYERS_PER_DAY),
    knocksPerPlayer: (measured
      ? last24Hours.knocks / last24Hours.players
      : knocksPerDay +
        (giftiesPerPlayer(yesterday) ?? DEFAULT_GIFTY_SEND_RATE)
    ).toFixed(2),
  };
  const [winRatePct, setWinRatePct] = useState(defaults.winRatePct);
  const [players, setPlayers] = useState(defaults.players);
  const [knocksPerPlayer, setKnocksPerPlayer] = useState(
    defaults.knocksPerPlayer,
  );

  const stock = sum(prizes, "currentStock");
  const rate = Math.min(parsed(winRatePct, winRate * 100) / 100, 1);
  const guildKnocks =
    parsed(players, Number(defaults.players)) *
    parsed(knocksPerPlayer, Number(defaults.knocksPerPlayer));
  // One moment for the whole forecast, so it does not re-roll on every render.
  const [openedAt] = useState(now);
  // Days with no knocks: those before the start.
  const startsIn = startDate
    ? Math.max(0, (new Date(startDate).getTime() - openedAt.getTime()) / DAY_MS)
    : 0;

  const inputs = useMemo(
    () => ({ stock, rate, guildKnocks, startsIn }),
    [stock, rate, guildKnocks, startsIn],
  );
  // Typing stays responsive while the forecast catches up.
  const forecastInputs = useDeferredValue(inputs);
  const runOut = useMemo(() => {
    const knocking = forecastRunOut({
      stock: forecastInputs.stock,
      winRate: forecastInputs.rate,
      knocksPerDay: forecastInputs.guildKnocks,
      runs: forecastRuns(forecastInputs.stock),
      rng: Math.random,
    });
    return knocking && knocking.map((d) => d + forecastInputs.startsIn);
  }, [forecastInputs]);
  const width = useMemo(() => (runOut ? bucketWidth(runOut) : 0.25), [runOut]);
  const buckets = useMemo(
    () => (runOut ? histogram(runOut, width) : []),
    [runOut, width],
  );
  const tallest = Math.max(1, ...buckets.map((b) => b.count));
  const daysToEnd = endDate
    ? (new Date(endDate).getTime() - openedAt.getTime()) / DAY_MS
    : null;
  const chartFrom = buckets[0]?.from ?? 0;
  const chartTo = (buckets[buckets.length - 1]?.from ?? 0) + width;
  const markerShare =
    daysToEnd !== null && daysToEnd >= chartFrom && daysToEnd <= chartTo
      ? (daysToEnd - chartFrom) / (chartTo - chartFrom)
      : null;
  const beforeEnd =
    runOut && daysToEnd !== null
      ? runOut.filter((d) => d <= daysToEnd).length / runOut.length
      : null;
  const median = runOut ? quantile(runOut, 0.5) : null;

  return (
    <Stack as="section" gap="md" className={styles.card}>
      <h3 className={styles.sectionTitle}>When the prizes run out</h3>
      <Grid min="md" gap="sm">
        <label className={styles.field}>
          Win rate (%)
          <input
            className={styles.input}
            inputMode="decimal"
            value={winRatePct}
            onChange={(e) => setWinRatePct(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Players a day
          <input
            className={styles.input}
            inputMode="numeric"
            value={players}
            onChange={(e) => setPlayers(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          Knocks per player a day
          <input
            className={styles.input}
            inputMode="decimal"
            value={knocksPerPlayer}
            onChange={(e) => setKnocksPerPlayer(e.target.value)}
          />
        </label>
      </Grid>
      <Cluster justify="space-between">
        <p className={styles.muted}>
          {measured
            ? "Players and knocks start from the last 24 hours."
            : `Nobody has knocked in the last 24 hours, so players start at ${DEFAULT_PLAYERS_PER_DAY}.`}
        </p>
        <Button
          tone="secondary"
          size="sm"
          onClick={() => {
            setWinRatePct(defaults.winRatePct);
            setPlayers(defaults.players);
            setKnocksPerPlayer(defaults.knocksPerPlayer);
          }}
        >
          Reset
        </Button>
      </Cluster>

      <Stack gap="xs" data-testid="halloween-forecast-summary">
        {runOut && median !== null ? (
          <>
            <p className={styles.summaryLine}>
              Median: {days(median)} ({stock} prizes, {Math.round(guildKnocks)}{" "}
              knocks a day)
            </p>
            <p className={styles.summaryLine}>
              80% of runs: {days(quantile(runOut, 0.1))} to{" "}
              {days(quantile(runOut, 0.9))}
            </p>
            <p className={styles.summaryLine}>
              {daysToEnd === null
                ? "No end date set"
                : `Runs out before the scheduled end (${days(daysToEnd)}): ${percent(beforeEnd ?? 0)}`}
            </p>
          </>
        ) : (
          <>
            <p className={styles.summaryLine}>
              Never: no wins or no knocks at these numbers
            </p>
            <p className={styles.summaryLine}>&nbsp;</p>
            <p className={styles.summaryLine}>&nbsp;</p>
          </>
        )}
      </Stack>

      <div
        className={styles.chart}
        role="img"
        aria-label={
          median === null
            ? "No forecast"
            : `Days until the prizes run out, in quarter days; median ${days(median)}`
        }
      >
        {buckets.map((b) => (
          <div
            key={b.from}
            className={styles.bar}
            style={assignInlineVars({
              [styles.barShare]: `${(b.count / tallest) * 100}%`,
            })}
          />
        ))}
        {markerShare !== null ? (
          <div
            className={styles.marker}
            style={assignInlineVars({
              [styles.markerAt]: `${markerShare * 100}%`,
            })}
          />
        ) : null}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>{days(chartFrom)}</span>
        <span>{days((chartFrom + chartTo) / 2)}</span>
        <span>{days(chartTo)}</span>
      </div>
      <p className={styles.muted}>
        Days from now. Each bar is{" "}
        {width === 0.25 ? "a quarter day" : `${width} days`}
        {markerShare !== null ? "; the dashed line is the scheduled end." : "."}
      </p>
    </Stack>
  );
};
