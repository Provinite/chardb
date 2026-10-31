import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { Candy as CandyIcon, Link2, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { usePageMeta } from "../lib/pageMeta";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Tooltip } from "@chardb/ui";
import { CandyBoard } from "../components/halloween/CandyBoard";
import { formatBoardName } from "../components/halloween/boardName";
import { copyBoardLink } from "../components/halloween/copyBoardLink";
import { CANDY_BOARD_LIMIT } from "@chardb/shared";
import {
  MyHalloweenCandyBoardsDocument,
  useCreateHalloweenCandyBoardMutation,
  useDeleteHalloweenCandyBoardMutation,
  useMyHalloweenCandyBoardsQuery,
  type HalloweenCandyBoardFieldsFragment,
} from "../generated/graphql";

/**
 * `/halloween/board`: a player's candy boards. Each is shown as it looks,
 * opened, shared or deleted from here; every board can use all of their
 * candies, so a new one starts with the whole collection in its tray.
 */

const Container = styled.div`
  max-width: 1120px;
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

const NewBoard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font: inherit;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Hint = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const Card = styled.article`
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

/** The board as it looks, which opens it. Only looked at, never pressed. */
const Preview = styled(Link)`
  display: block;
  padding: ${({ theme }) => theme.spacing.sm};

  > * {
    pointer-events: none;
  }

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const CardBody = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md}
    ${({ theme }) => theme.spacing.md};
`;

const CardText = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.h2`
  margin: 0;
  overflow: hidden;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CardMeta = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  padding: 3rem 1rem;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

type Board = HalloweenCandyBoardFieldsFragment;

/** What a board is called on its card: its name, or "Untitled board". */
const titleOf = (board: Board) =>
  board.name ? formatBoardName(board.name) : "Untitled board";

export const CommunityCandyBoardsPage: React.FC = () => {
  const communityId = useCommunityId();
  const enabled = Boolean(useHostCommunity()?.halloweenEnabled);
  const navigate = useNavigate();
  usePageMeta({ title: "Your candy boards", description: "Halloween candies" });

  const { data, loading, error, refetch } = useMyHalloweenCandyBoardsQuery({
    variables: { communityId: communityId as string },
    skip: !communityId || !enabled,
    fetchPolicy: "cache-and-network",
  });
  const [create, { loading: creating }] =
    useCreateHalloweenCandyBoardMutation();
  const [remove, { loading: deleting }] =
    useDeleteHalloweenCandyBoardMutation();
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);

  if (!enabled) {
    return (
      <Container>
        <Message>Halloween isn't running in this community.</Message>
      </Container>
    );
  }
  if (loading && !data) return <LoadingSpinner />;
  if (error) {
    return (
      <Container>
        <Message>{error.message}</Message>
      </Container>
    );
  }
  const boards = data?.myHalloweenCandyBoards;
  if (!boards) {
    return (
      <Container>
        <Message>
          Link your Discord account to collect candies here.{" "}
          <Link to="/profile/edit">Link Discord</Link>
        </Message>
      </Container>
    );
  }

  const makeBoard = async () => {
    if (!communityId) return;
    try {
      const result = await create({
        variables: { communityId },
        // The list fetched again, so coming back to it shows the new board.
        refetchQueries: [
          { query: MyHalloweenCandyBoardsDocument, variables: { communityId } },
        ],
        awaitRefetchQueries: true,
      });
      const id = result.data?.createHalloweenCandyBoard.id;
      if (id) navigate(`/halloween/board/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not make a board");
    }
  };

  const deleteBoard = async (board: Board) => {
    if (!communityId) return;
    try {
      await remove({ variables: { communityId, id: board.id } });
      setDeletingBoard(null);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete it");
    }
  };

  const atLimit = boards.length >= CANDY_BOARD_LIMIT;
  const collection = boards[0]?.candies.length;

  return (
    <Container>
      <Header>
        <div>
          <Title>
            <CandyIcon size={28} aria-hidden />
            Your candy boards
          </Title>
          {collection !== undefined && (
            <Meta>
              Every board can use all {collection}{" "}
              {collection === 1 ? "candy" : "candies"} you've collected
            </Meta>
          )}
        </div>
        {boards.length > 0 && (
          <NewBoard>
            <Button
              type="button"
              disabled={atLimit || creating}
              onClick={makeBoard}
            >
              <Plus size={16} aria-hidden />
              New board
            </Button>
            {atLimit && (
              <Hint>
                {CANDY_BOARD_LIMIT} boards is the most you can have. Delete one
                to make another.
              </Hint>
            )}
          </NewBoard>
        )}
      </Header>

      {boards.length === 0 ? (
        <Empty>
          <p>
            Stick the candies your knocks leave you on a board of your own, then
            share it.
          </p>
          <Button type="button" disabled={creating} onClick={makeBoard}>
            <Plus size={16} aria-hidden />
            Create your first board
          </Button>
        </Empty>
      ) : (
        <Grid>
          {boards.map((board) => {
            const title = titleOf(board);
            const stickers = board.placements.length;
            return (
              <Card key={board.id}>
                <Preview
                  to={`/halloween/board/${board.id}`}
                  aria-label={`Open ${title}`}
                >
                  <CandyBoard
                    candies={board.candies}
                    placements={board.placements}
                    background={board.background}
                    backgroundEffects={board.backgroundEffects}
                    lighting={board.lighting}
                    name={board.name}
                  />
                </Preview>
                <CardBody>
                  <CardText>
                    <CardTitle>{title}</CardTitle>
                    <CardMeta>
                      {stickers === 0
                        ? "No stickers yet"
                        : `${stickers} ${stickers === 1 ? "sticker" : "stickers"}`}
                    </CardMeta>
                  </CardText>
                  <Tooltip label="Copy link">
                    <IconButton
                      type="button"
                      aria-label={`Copy link to ${title}`}
                      onClick={() => copyBoardLink(board.id)}
                    >
                      <Link2 size={18} aria-hidden />
                    </IconButton>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <IconButton
                      type="button"
                      aria-label={`Delete ${title}`}
                      onClick={() => setDeletingBoard(board)}
                    >
                      <Trash2 size={18} aria-hidden />
                    </IconButton>
                  </Tooltip>
                </CardBody>
              </Card>
            );
          })}
        </Grid>
      )}

      <ConfirmDialog
        open={deletingBoard !== null}
        destructive
        title={`Delete ${deletingBoard ? titleOf(deletingBoard) : "this board"}?`}
        confirmLabel="Delete"
        busy={deleting}
        busyLabel="Deleting…"
        onCancel={() => setDeletingBoard(null)}
        onConfirm={() => deletingBoard && deleteBoard(deletingBoard)}
      >
        Its stickers come off with it. Your candies stay yours, for every other
        board.
      </ConfirmDialog>
    </Container>
  );
};
