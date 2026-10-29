import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Button } from "@chardb/ui";
import { usePageMeta } from "../lib/pageMeta";
import {
  useDiscordNameBackfillStatusQuery,
  useRunDiscordNameBackfillMutation,
} from "../generated/graphql";

/**
 * Looks up the Discord username and display name of every unclaimed Discord
 * pending owner.
 *
 * Pending owners recorded before names were kept have only a numeric id, so
 * staff cannot find them by the names they know (#445). Grants record names
 * now; this catches up the rest. Rerunnable, to refresh names people change.
 */

/** Often enough to watch a few hundred lookups go by. */
const POLL_MS = 2000;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  line-height: 1.5;
`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const Stat = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};

  .k {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.colors.text.muted};
  }

  .v {
    font-size: 1.5rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Muted = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  margin: ${({ theme }) => theme.spacing.md} 0 0 0;
`;

export const DiscordNameBackfillPage: React.FC = () => {
  usePageMeta({ title: "Discord Names" });

  const { data, error, refetch, startPolling, stopPolling } =
    useDiscordNameBackfillStatusQuery({ fetchPolicy: "network-only" });
  const [run, { loading: starting, error: runError }] =
    useRunDiscordNameBackfillMutation();

  const status = data?.discordNameBackfillStatus;
  const running = Boolean(status?.running);

  // Poll only while a run is going; an idle page asks nothing.
  React.useEffect(() => {
    if (running) startPolling(POLL_MS);
    else stopPolling();
    return stopPolling;
  }, [running, startPolling, stopPolling]);

  const start = async () => {
    await run();
    await refetch();
  };

  const hasRun = Boolean(status?.startedAt);

  return (
    <Container>
      <Link to="/admin">← Site Administration</Link>
      <Title>Discord Names</Title>
      <Description>
        Looks up the current Discord username and display name of everyone
        holding unclaimed items or characters through a Discord account, so
        staff can search for them by name. Names people have changed since the
        last run are refreshed.
      </Description>

      <Button onClick={() => void start()} disabled={running || starting}>
        {running ? "Looking up names…" : "Look up Discord names"}
      </Button>

      {(error || runError) && (
        <Muted role="alert">{(runError ?? error)?.message}</Muted>
      )}

      {status && hasRun && (
        <>
          <Stats>
            <Stat data-testid="backfill-progress">
              <div className="k">Looked up</div>
              <div className="v">
                {status.processed} of {status.total}
              </div>
            </Stat>
            <Stat data-testid="backfill-named">
              <div className="k">Named</div>
              <div className="v">{status.updated}</div>
            </Stat>
            <Stat data-testid="backfill-not-found">
              <div className="k">Not found</div>
              <div className="v">{status.notFound}</div>
            </Stat>
            <Stat data-testid="backfill-failed">
              <div className="k">Couldn't reach Discord</div>
              <div className="v">{status.failed}</div>
            </Stat>
          </Stats>
          {status.finishedAt && (
            <Muted>
              Finished {new Date(status.finishedAt).toLocaleString()}.
              {status.failed > 0 &&
                " Run it again to retry the accounts Discord didn't answer for."}
            </Muted>
          )}
        </>
      )}
    </Container>
  );
};
