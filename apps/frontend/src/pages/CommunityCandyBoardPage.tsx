import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { Candy as CandyIcon, Link2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { usePageMeta } from "../lib/pageMeta";
import { useAuth } from "../contexts/AuthContext";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CandyBoard } from "../components/halloween/CandyBoard";
import type { Placement } from "../components/halloween/candyBoard";
import {
  useHalloweenCandyBoardQuery,
  useSaveHalloweenCandyBoardMutation,
} from "../generated/graphql";

/**
 * A player's Halloween candy board. Every lost `/knock` in Discord gives a
 * candy; this is where they stick them. Anyone with the link can look, so a
 * board can be shown off; only its owner can arrange it, and every change is
 * saved on its own a moment after it is made.
 */

/** How long after the last change a board is saved. */
const SAVE_DELAY_MS = 600;

type SaveState = "idle" | "saving" | "saved" | "failed";

const Container = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
`;

const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Meta = styled.p`
  margin: 0.25rem 0 0;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Status = styled.span`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const ShareButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

const STATUS_TEXT: Record<SaveState, string | null> = {
  idle: null,
  saving: "Saving...",
  saved: "Saved",
  failed: "Not saved",
};

/** `/halloween/board`: your own board, under your username. */
export const MyCandyBoardRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to={`/halloween/board/${user.username}`} replace />;
};

export const CommunityCandyBoardPage: React.FC = () => {
  const { username = "" } = useParams<{ username: string }>();
  const { user } = useAuth();
  const communityId = useCommunityId();
  const community = useHostCommunity();
  const enabled = Boolean(community?.halloweenEnabled);
  const isOwner = user?.username === username;

  const { data, loading, error } = useHalloweenCandyBoardQuery({
    variables: { communityId: communityId as string, username },
    skip: !communityId || !enabled || !username,
    fetchPolicy: "cache-and-network",
  });
  const [saveBoard] = useSaveHalloweenCandyBoardMutation();

  const board = data?.halloweenCandyBoard ?? null;
  const ownerName =
    board?.owner.displayName || board?.owner.username || username;

  usePageMeta({
    title: isOwner ? "Your candy board" : `${ownerName}'s candy board`,
    description: `${ownerName}'s Halloween candies`,
  });

  // The page keeps its own copy once loaded, so a save coming back cannot
  // undo an edit made while it was in flight.
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const dirty = useRef(false);
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!board || loadedFor.current === board.owner.username) return;
    loadedFor.current = board.owner.username;
    dirty.current = false;
    setPlacements(
      board.placements.map(({ knockEventId, x, y, rotation, scale }) => ({
        knockEventId,
        x,
        y,
        rotation,
        scale,
      })),
    );
  }, [board]);

  useEffect(() => {
    if (!dirty.current || dragging || !placements || !communityId) return;
    const timer = setTimeout(async () => {
      dirty.current = false;
      setSaveState("saving");
      try {
        await saveBoard({ variables: { communityId, placements } });
        setSaveState(dirty.current ? "idle" : "saved");
      } catch (e) {
        setSaveState("failed");
        toast.error(
          e instanceof Error ? e.message : "Your board could not be saved",
        );
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [placements, dragging, communityId, saveBoard]);

  const edit = (next: Placement[]) => {
    dirty.current = true;
    setSaveState("idle");
    setPlacements(next);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/halloween/board/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (!enabled) {
    return (
      <Container>
        <Message>Halloween isn't running in this community.</Message>
      </Container>
    );
  }
  if (loading && !data) {
    return <LoadingSpinner />;
  }
  if (error) {
    return (
      <Container>
        <Message>{error.message}</Message>
      </Container>
    );
  }
  if (!board) {
    return (
      <Container>
        {isOwner ? (
          <Message>
            Link your Discord account to collect candies here.{" "}
            <Link to="/profile/edit">Link Discord</Link>
          </Message>
        ) : (
          <Message>{username} doesn't have a candy board yet.</Message>
        )}
      </Container>
    );
  }

  const count = board.candies.length;

  return (
    <Container>
      <Header>
        <div>
          <Title>
            <CandyIcon size={28} aria-hidden />
            {isOwner ? "Your candy board" : `${ownerName}'s candy board`}
          </Title>
          <Meta>
            {count} {count === 1 ? "candy" : "candies"} collected
          </Meta>
        </div>
        {isOwner && (
          <Actions>
            {STATUS_TEXT[saveState] && (
              <Status role="status">{STATUS_TEXT[saveState]}</Status>
            )}
            <ShareButton type="button" onClick={copyLink}>
              <Link2 size={16} aria-hidden />
              Copy link
            </ShareButton>
          </Actions>
        )}
      </Header>

      <CandyBoard
        candies={board.candies}
        placements={placements ?? []}
        onChange={isOwner ? edit : undefined}
        onDraggingChange={setDragging}
      />
    </Container>
  );
};
