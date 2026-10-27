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
  const inFlight = useRef(false);
  const server = useRef<Placement[]>(strip(serverPlacements ?? []));
  const [apply] = useApplyHalloweenCandyBoardActionsMutation();

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
      inFlight.current = true;
      setStatus("saving");
      try {
        const result = await apply({
          variables: { communityId, actions: batch },
        });
        inFlight.current = false;
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
        inFlight.current = false;
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
