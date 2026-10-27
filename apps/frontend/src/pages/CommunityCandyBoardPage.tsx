import React, { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { Candy as CandyIcon, Link2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { usePageMeta } from "../lib/pageMeta";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CandyBoard } from "../components/halloween/CandyBoard";
import {
  useCandyBoardSync,
  type SaveStatus,
} from "../components/halloween/useCandyBoardSync";
import {
  useHalloweenCandyBoardQuery,
  useMyHalloweenCandyBoardQuery,
  type HalloweenCandyBoardFieldsFragment,
} from "../generated/graphql";

/**
 * A player's Halloween candy board. Every lost `/knock` in Discord gives a
 * candy; this is where they stick them. A board's address is a random id, so
 * anyone given the link can look but nobody can find boards by username;
 * only its owner can arrange it, and every change is saved on its own.
 */

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

const Status = styled.span<{ $status: SaveStatus }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme, $status }) =>
    $status === "saved"
      ? theme.colors.success
      : $status === "failed"
        ? theme.colors.error
        : theme.colors.warning};
`;

const Button = styled.button`
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

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "Saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  failed: "Not saved",
};

const NotRunning: React.FC = () => (
  <Container>
    <Message>Halloween isn't running in this community.</Message>
  </Container>
);

/**
 * `/halloween/board`: your own board, which is made the first time you come
 * here so it has a link to share before anything is on it.
 */
export const MyCandyBoardRedirect: React.FC = () => {
  const communityId = useCommunityId();
  const enabled = Boolean(useHostCommunity()?.halloweenEnabled);
  const { data, loading, error } = useMyHalloweenCandyBoardQuery({
    variables: { communityId: communityId as string },
    skip: !communityId || !enabled,
    fetchPolicy: "network-only",
  });

  if (!enabled) return <NotRunning />;
  if (loading || (!data && !error)) return <LoadingSpinner />;
  if (error) {
    return (
      <Container>
        <Message>{error.message}</Message>
      </Container>
    );
  }
  const board = data?.myHalloweenCandyBoard;
  if (!board) {
    return (
      <Container>
        <Message>
          Link your Discord account to collect candies here.{" "}
          <Link to="/profile/edit">Link Discord</Link>
        </Message>
      </Container>
    );
  }
  return <Navigate to={`/halloween/board/${board.id}`} replace />;
};

export const CommunityCandyBoardPage: React.FC = () => {
  const { boardId = "" } = useParams<{ boardId: string }>();
  const communityId = useCommunityId();
  const enabled = Boolean(useHostCommunity()?.halloweenEnabled);

  const { data, loading, error, refetch } = useHalloweenCandyBoardQuery({
    variables: { communityId: communityId as string, id: boardId },
    skip: !communityId || !enabled || !boardId,
    fetchPolicy: "cache-and-network",
  });
  const board = data?.halloweenCandyBoard ?? null;

  if (!enabled) return <NotRunning />;
  if (loading && !data) return <LoadingSpinner />;
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
        <Message>There's no candy board here.</Message>
      </Container>
    );
  }
  return (
    <BoardView
      board={board}
      communityId={communityId}
      refetchPlacements={async () =>
        (await refetch()).data.halloweenCandyBoard?.placements
      }
    />
  );
};

const BoardView: React.FC<{
  board: HalloweenCandyBoardFieldsFragment;
  communityId: string | null;
  refetchPlacements: () => Promise<
    HalloweenCandyBoardFieldsFragment["placements"] | undefined
  >;
}> = ({ board, communityId, refetchPlacements }) => {
  const [dragging, setDragging] = useState(false);
  const { placements, act, status, retry } = useCandyBoardSync({
    communityId,
    serverPlacements: board.placements,
    refetchPlacements,
    dragging,
  });

  const isOwner = board.viewerIsOwner;
  const ownerName = board.owner?.displayName || board.owner?.username;
  const title = isOwner
    ? "Your candy board"
    : ownerName
      ? `${ownerName}'s candy board`
      : "A candy board";

  usePageMeta({
    title,
    description: ownerName
      ? `${ownerName}'s Halloween candies`
      : "Halloween candies",
  });

  const copyLink = async () => {
    const url = `${window.location.origin}/halloween/board/${board.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const count = board.candies.length;

  return (
    <Container>
      <Header>
        <div>
          <Title>
            <CandyIcon size={28} aria-hidden />
            {title}
          </Title>
          <Meta>
            {count} {count === 1 ? "candy" : "candies"} collected
          </Meta>
        </div>
        {isOwner && (
          <Actions>
            <Status role="status" $status={status}>
              {STATUS_TEXT[status]}
            </Status>
            {status === "failed" && (
              <Button type="button" onClick={retry}>
                Retry
              </Button>
            )}
            <Button type="button" onClick={copyLink}>
              <Link2 size={16} aria-hidden />
              Copy link
            </Button>
          </Actions>
        )}
      </Header>

      <CandyBoard
        candies={board.candies}
        placements={placements}
        onAction={isOwner ? act : undefined}
        onDraggingChange={setDragging}
      />
    </Container>
  );
};
