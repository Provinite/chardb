import { useCallback, useEffect, useRef, useState } from "react";
import { ApolloError } from "@apollo/client";
import { toast } from "react-hot-toast";
import { useApplyHalloweenCandyBoardActionsMutation } from "../../generated/graphql";
import {
  applyAction,
  enqueue,
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
 * and is queued; the queue goes as one batch at a time, so batches arrive in
 * the order they were made, and nothing is sent while a candy is mid-drag.
 * Whenever nothing is waiting, the page takes the server's copy, so a board
 * changed elsewhere catches up instead of being written over.
 *
 * A batch the server refuses is undone, back to the server's copy. A batch
 * that never reached it is kept, for `retry`.
 */
export function useCandyBoardSync({
  communityId,
  serverPlacements,
  dragging,
}: {
  communityId: string | null;
  /** The board as the server last gave it; undefined until loaded. */
  serverPlacements: readonly Placement[] | undefined;
  dragging: boolean;
}) {
  const [placements, setPlacements] = useState<Placement[]>(() =>
    strip(serverPlacements ?? []),
  );
  const [status, setStatus] = useState<SaveStatus>("saved");
  /** Bumped to wake the sender after a change or a retry. */
  const [wake, setWake] = useState(0);
  const queue = useRef<BoardAction[]>([]);
  /** The batch on its way, if one is. */
  const inFlight = useRef<Promise<unknown> | null>(null);
  const server = useRef<Placement[]>(strip(serverPlacements ?? []));
  const [apply] = useApplyHalloweenCandyBoardActionsMutation();
  /** For the unmount cleanup, which sees only the first render's values. */
  const latest = useRef({ communityId, apply });
  latest.current = { communityId, apply };

  const idle = () =>
    queue.current.length === 0 && !inFlight.current && !dragging;

  useEffect(() => {
    if (!serverPlacements) return;
    server.current = strip(serverPlacements);
    if (idle()) setPlacements(server.current);
    // `idle` reads refs and `dragging`; only a new server copy should run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPlacements]);

  const act = useCallback((action: BoardAction) => {
    setPlacements((current) => applyAction(current, action));
    queue.current = enqueue(queue.current, action);
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
      const batch = queue.current;
      queue.current = [];
      setStatus("saving");
      try {
        const request = apply({
          variables: { communityId, actions: batch },
        });
        inFlight.current = request;
        const result = await request;
        inFlight.current = null;
        const saved = result.data?.applyHalloweenCandyBoardActions.placements;
        if (saved) server.current = strip(saved);
        if (queue.current.length === 0) {
          setPlacements(server.current);
          setStatus("saved");
        } else {
          setStatus("unsaved");
          setWake((n) => n + 1);
        }
      } catch (error) {
        inFlight.current = null;
        if (error instanceof ApolloError && error.graphQLErrors.length > 0) {
          // The server said no; what it has is the truth.
          queue.current = [];
          setPlacements(server.current);
          setStatus("saved");
          toast.error(error.message);
        } else {
          queue.current = [...batch, ...queue.current];
          setStatus("failed");
        }
      }
    }, SEND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [wake, dragging, status, communityId, apply]);

  const retry = useCallback(() => {
    setStatus("unsaved");
    setWake((n) => n + 1);
  }, []);

  // Leaving the page within the app -- a sidebar link -- unmounts this before
  // the send delay is up, or mid-drag. The app keeps running then, so what is
  // waiting is sent now, after any batch already on its way so the two arrive
  // in order. (Closing the tab is the beforeunload warning's job: nothing
  // started then is sure to finish.)
  useEffect(
    () => () => {
      const pending = queue.current;
      const { communityId: id, apply: send } = latest.current;
      if (!id || pending.length === 0) return;
      queue.current = [];
      void (inFlight.current ?? Promise.resolve())
        .catch(() => undefined)
        .then(() => send({ variables: { communityId: id, actions: pending } }))
        .catch(() => {
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
