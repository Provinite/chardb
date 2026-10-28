import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import styled from "styled-components";
import {
  Candy as CandyIcon,
  Eraser,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { usePageMeta } from "../lib/pageMeta";
import {
  useCommunityId,
  useHostCommunity,
} from "../contexts/CommunityHostContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { CandyBoard } from "../components/halloween/CandyBoard";
import { BackgroundDialog } from "../components/halloween/BackgroundDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useCandyBoardSync } from "../components/halloween/useCandyBoardSync";
import { SaveStatusIndicator } from "../components/halloween/SaveStatusIndicator";
import { LightingControl } from "../components/halloween/LightingControl";
import type { Lighting } from "../components/halloween/candyLighting";
import type { BackgroundEffects } from "../components/halloween/backgroundEffects";
import {
  useHalloweenCandyBoardQuery,
  useMyHalloweenCandyBoardQuery,
  useSetHalloweenCandyBoardBackgroundMutation,
  useSetHalloweenCandyBoardLightingMutation,
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

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};

  a {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

/** How long after the light last moves it is saved. */
const LIGHTING_SAVE_DELAY_MS = 300;

/** A board's light as the API sends it, as the controls hold it. */
const stripLighting = (
  lighting: HalloweenCandyBoardFieldsFragment["lighting"],
): Lighting | null =>
  lighting
    ? {
        x: lighting.x,
        y: lighting.y,
        height: lighting.height,
        intensity: lighting.intensity,
        colour: lighting.colour ?? null,
        colourStrength: lighting.colourStrength,
        spotlight: lighting.spotlight,
        cone: lighting.cone,
      }
    : null;

/** How a board's background is muted as the API sends it, as the dialog holds it. */
const stripEffects = (
  effects: HalloweenCandyBoardFieldsFragment["backgroundEffects"],
): BackgroundEffects | null =>
  effects
    ? {
        dim: effects.dim,
        tint: effects.tint ?? null,
        tintStrength: effects.tintStrength,
        saturation: effects.saturation,
      }
    : null;

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

  // Shown as soon as it is used, and saved on its own: a background is one
  // value, nothing like the stream of candy changes the sync hook queues.
  const [background, setBackground] = useState(board.background ?? null);
  useEffect(() => setBackground(board.background ?? null), [board.background]);
  const savedEffects = stripEffects(board.backgroundEffects);
  const [backgroundEffects, setBackgroundEffects] =
    useState<BackgroundEffects | null>(savedEffects);
  useEffect(
    () => setBackgroundEffects(stripEffects(board.backgroundEffects)),
    [board.backgroundEffects],
  );
  const [saveBackground] = useSetHalloweenCandyBoardBackgroundMutation();
  // The light follows the control as it moves, and is saved once it rests.
  const savedLighting = stripLighting(board.lighting);
  const [lighting, setLighting] = useState<Lighting | null>(savedLighting);
  const lightingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!lightingSave.current) setLighting(stripLighting(board.lighting));
  }, [board.lighting]);
  useEffect(
    () => () => {
      if (lightingSave.current) clearTimeout(lightingSave.current);
    },
    [],
  );
  const [saveLighting] = useSetHalloweenCandyBoardLightingMutation();
  const changeLighting = (next: Lighting | null) => {
    setLighting(next);
    if (lightingSave.current) clearTimeout(lightingSave.current);
    lightingSave.current = setTimeout(async () => {
      lightingSave.current = null;
      if (!communityId) return;
      try {
        await saveLighting({ variables: { communityId, lighting: next } });
      } catch (error) {
        setLighting(savedLighting);
        toast.error(
          error instanceof Error ? error.message : "Could not move the light",
        );
      }
    }, LIGHTING_SAVE_DELAY_MS);
  };

  const [choosingBackground, setChoosingBackground] = useState(false);
  const [clearing, setClearing] = useState(false);
  const useBackground = async (
    slug: string | null,
    effects: BackgroundEffects | null,
  ) => {
    const saved = board.background ?? null;
    setBackground(slug);
    setBackgroundEffects(effects);
    if (!communityId) return;
    try {
      await saveBackground({ variables: { communityId, slug, effects } });
    } catch (error) {
      setBackground(saved);
      setBackgroundEffects(savedEffects);
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not change the background",
      );
    }
  };

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
            <SaveStatusIndicator status={status} />
            {status === "failed" && (
              <Button type="button" onClick={retry}>
                Retry
              </Button>
            )}
            <LightingControl value={lighting} onChange={changeLighting} />
            <Button type="button" onClick={() => setChoosingBackground(true)}>
              <ImageIcon size={16} aria-hidden />
              Background
            </Button>
            <Button
              type="button"
              disabled={placements.length === 0}
              onClick={() => setClearing(true)}
            >
              <Eraser size={16} aria-hidden />
              Clear board
            </Button>
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
        background={background}
        backgroundEffects={backgroundEffects}
        lighting={lighting}
      />

      {isOwner && (
        <>
          <BackgroundDialog
            open={choosingBackground}
            value={background}
            effects={backgroundEffects}
            lighting={lighting}
            onClose={() => setChoosingBackground(false)}
            onUse={useBackground}
          />
          <ConfirmDialog
            open={clearing}
            destructive
            title="Clear the board?"
            confirmLabel="Clear"
            onCancel={() => setClearing(false)}
            onConfirm={() => {
              for (const { knockEventId } of placements) {
                act({ remove: { knockEventId } });
              }
              setClearing(false);
            }}
          />
        </>
      )}
    </Container>
  );
};
