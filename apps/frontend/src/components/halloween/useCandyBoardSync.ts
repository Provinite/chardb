import { useCallback, useEffect, useRef, useState } from "react";
import { ApolloError } from "@apollo/client";
import { toast } from "react-hot-toast";
import { useApplyHalloweenCandyBoardActionsMutation } from "../../generated/graphql";
import {
  applyAction,
  clampAction,
  enqueue,
  nextBatch,
  type BoardAction,
  type Placement,
} from "./candyBoard";

/**
 * Whether what the page shows is what the server has:
 * - saved: it is.
 * - unsaved: changes are waiting to be sent.
 * - saving: changes are on their way.
 * - failed: changes could not reach the server; they are kept for a retry.
 */
export type SaveStatus = "saved" | "unsaved" | "saving" | "failed";

/** How long after the last change the waiting changes are sent. */
const SEND_DELAY_MS = 400;

const strip = (placements: readonly Placement[]): Placement[] =>
  placements.map(({ knockEventId, x, y, rotation, scale }) => ({
    knockEventId,
    x,
    y,
    rotation,
    scale,
  }));

/**
 * Keeps a board's placements in step with the server. A change shows at once
 * and is queued; the queue goes a batch at a time, so batches arrive in the
 * order they were made, and nothing is sent while a candy is mid-drag.
 *
 * The server is the truth: every save sends back the board as it now is,
 * with any change it could not apply skipped, and once nothing is waiting the
 * page shows that. A save the server refuses outright has the board fetched
 * afresh, with whatever is still waiting laid back over it. A save that never
 * reached the server is kept, for `retry`; sent again, a change that did land
 * the first time is simply skipped.
 */
export function useCandyBoardSync({
  communityId,
  serverPlacements,
  refetchPlacements,
  dragging,
}: {
  communityId: string | null;
  /** The board as the server last gave it; undefined until loaded. */
  serverPlacements: readonly Placement[] | undefined;
  /** Fetches the board from the server again, past any cache. */
  refetchPlacements: () => Promise<readonly Placement[] | undefined>;
  dragging: boolean;
}) {
  const [placements, setPlacements] = useState<Placement[]>(() =>
    strip(serverPlacements ?? []),
  );
  /**
   * What the page shows, kept in step synchronously: each change is clamped
   * against the candy as it stands, which two changes between renders would
   * otherwise each measure against the same stale state.
   */
  const shown = useRef<Placement[]>(placements);
  const show = (next: Placement[]) => {
    shown.current = next;
    setPlacements(next);
  };
  const [status, setStatus] = useState<SaveStatus>("saved");
  /** Bumped to wake the sender after a change or a retry. */
  const [wake, setWake] = useState(0);
  const queue = useRef<BoardAction[]>([]);
  /** The batch on its way, if one is. */
  const inFlight = useRef<Promise<unknown> | null>(null);
  const [apply] = useApplyHalloweenCandyBoardActionsMutation();
  /** For the unmount cleanup, which sees only the first render's values. */
  const latest = useRef({ communityId, apply });
  latest.current = { communityId, apply };

  /** The server's board, with whatever is still waiting laid over it. */
  const showServer = (server: readonly Placement[]) =>
    show(queue.current.reduce(applyAction, strip(server)));

  useEffect(() => {
    if (!serverPlacements) return;
    if (queue.current.length === 0 && !inFlight.current && !dragging) {
      show(strip(serverPlacements));
    }
    // Only a new server copy should run this; the rest is read as it stands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPlacements]);

  const act = useCallback((action: BoardAction) => {
    const clamped = clampAction(shown.current, action);
    show(applyAction(shown.current, clamped));
    queue.current = enqueue(queue.current, clamped);
    setStatus((s) => (s === "failed" ? s : "unsaved"));
    setWake((n) => n + 1);
  }, []);

  useEffect(() => {
    if (
      !communityId ||
      dragging ||
      inFlight.current ||
      queue.current.length === 0 ||
      status === "failed"
    ) {
      return;
    }
    const timer = setTimeout(async () => {
      const [batch, rest] = nextBatch(queue.current);
      queue.current = rest;
      setStatus("saving");
      try {
        const request = apply({
          variables: { communityId, actions: batch },
        });
        inFlight.current = request;
        const result = await request;
        inFlight.current = null;
        const saved = result.data?.applyHalloweenCandyBoardActions.placements;
        if (saved) showServer(saved);
      } catch (error) {
        inFlight.current = null;
        if (!(error instanceof ApolloError && error.graphQLErrors.length > 0)) {
          // Never reached the server, or never answered: kept for a retry.
          queue.current = [...batch, ...queue.current];
          setStatus("failed");
          return;
        }
        // Refused outright. Whatever the server has now is the truth.
        toast.error(error.message);
        const fresh = await refetchPlacements().catch(() => undefined);
        if (fresh) showServer(fresh);
      }
      if (queue.current.length === 0) {
        setStatus("saved");
      } else {
        setStatus("unsaved");
        setWake((n) => n + 1);
      }
    }, SEND_DELAY_MS);
    return () => clearTimeout(timer);
    // `showServer` and `refetchPlacements` only read refs and the network.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wake, dragging, status, communityId, apply]);

  const retry = useCallback(() => {
    setStatus("unsaved");
    setWake((n) => n + 1);
  }, []);

  // Leaving the page within the app -- a sidebar link -- unmounts this before
  // the send delay is up, or mid-drag. The app keeps running then, so what is
  // waiting is sent now, after any batch already on its way so they arrive in
  // order. (Closing the tab is the beforeunload warning's job: nothing
  // started then is sure to finish.)
  useEffect(
    () => () => {
      const { communityId: id, apply: send } = latest.current;
      if (!id || queue.current.length === 0) return;
      let pending = queue.current;
      queue.current = [];
      let chain = (inFlight.current ?? Promise.resolve()).catch(
        () => undefined,
      );
      while (pending.length > 0) {
        const [batch, rest] = nextBatch(pending);
        pending = rest;
        chain = chain.then(() =>
          send({ variables: { communityId: id, actions: batch } }).then(
            () => undefined,
          ),
        );
      }
      chain.catch(() => {
        toast.error("Your last candy board change could not be saved");
      });
    },
    [],
  );

  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  return { placements, act, status, retry };
}
