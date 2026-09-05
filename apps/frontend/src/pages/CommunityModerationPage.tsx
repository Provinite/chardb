import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Image, ClipboardCheck } from "lucide-react";
import { Title, Subtitle, Card } from "@chardb/ui";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useUserCommunityRole } from "../hooks/useUserCommunityRole";
import { useCommunityId } from "../contexts/CommunityHostContext";
import {
  usePendingImageCountQuery,
  usePendingTraitReviewCountQuery,
} from "../generated/graphql";

/**
 * Community Moderation Index
 *
 * The shared home for a community's two review queues. Both are reachable
 * from the sidebar directly, but the admin dashboard's "Content Moderation"
 * card promises both at once, so it lands here rather than on either one.
 *
 * Each queue is shown only to a role that can actually work it, and its
 * pending count is fetched under that same permission -- `pendingImageCount`
 * and `pendingTraitReviewCount` are guarded server-side by exactly the flags
 * gating the cards, so the `skip` below is what keeps a moderator holding
 * only one of the two from firing a query that would 403.
 */

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Breadcrumb = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Header = styled.div`
  margin-bottom: 3rem;
`;

const QueueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const QueueCard = styled(Card).attrs({ as: Link })`
  text-decoration: none;
  display: block;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CardIcon = styled.div`
  width: 3rem;
  height: 3rem;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
`;

const PendingCount = styled.div<{ $empty: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: ${({ theme, $empty }) =>
    $empty ? theme.colors.text.muted : theme.colors.primary};
`;

const PendingNumber = styled.span`
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
`;

const PendingLabel = styled.span`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CardTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 0.5rem 0;
`;

const CardDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.muted};
  margin: 0;
  line-height: 1.4;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem;
`;

const MessageContainer = styled.div`
  text-align: center;
  padding: 4rem 2rem;
`;

const ErrorContainer = styled(MessageContainer)`
  color: ${({ theme }) => theme.colors.error};
`;

export const CommunityModerationPage: React.FC = () => {
  const communityId = useCommunityId();

  // Every hook runs before the guards below. These pages have a history of
  // returning early above their hooks, which breaks the moment one mounted
  // instance renders both ways -- see route-param-guards.test.tsx.
  const {
    community,
    permissions,
    loading: roleLoading,
    error: roleError,
  } = useUserCommunityRole(communityId ?? undefined);

  const canModerateImages = permissions.canModerateImages;
  const canReviewTraits = permissions.canEditCharacterRegistry;

  const { data: imageCountData } = usePendingImageCountQuery({
    variables: { communityId: communityId! },
    skip: !communityId || !canModerateImages,
    fetchPolicy: "cache-and-network",
  });

  const { data: traitCountData } = usePendingTraitReviewCountQuery({
    variables: { communityId: communityId! },
    skip: !communityId || !canReviewTraits,
    fetchPolicy: "cache-and-network",
  });

  if (!communityId) {
    return (
      <Container>
        <Title>Content Moderation</Title>
        <Subtitle>This address names no community</Subtitle>
      </Container>
    );
  }

  if (roleLoading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner size="lg" />
        </LoadingContainer>
      </Container>
    );
  }

  if (roleError) {
    return (
      <Container>
        <ErrorContainer>
          <Title>Error Loading Community</Title>
          <Subtitle>{roleError.message}</Subtitle>
        </ErrorContainer>
      </Container>
    );
  }

  // Reachable by URL, so the permission check has to live here and not only
  // on the cards that link in.
  if (!canModerateImages && !canReviewTraits) {
    return (
      <Container>
        <ErrorContainer>
          <Title>Access Denied</Title>
          <Subtitle>
            You don't have permission to moderate content in this community.
          </Subtitle>
        </ErrorContainer>
      </Container>
    );
  }

  const pendingImages = imageCountData?.pendingImageCount ?? 0;
  const pendingTraits = traitCountData?.pendingTraitReviewCount ?? 0;

  return (
    <Container>
      <Breadcrumb>
        <Link to="/">{community?.name || "Community"}</Link>
        <span>/</span>
        <Link to="/admin">Administration</Link>
        <span>/</span>
        <span>Content Moderation</span>
      </Breadcrumb>

      <Header>
        <Title>Content Moderation</Title>
        <Subtitle>
          Review what members have submitted and keep the community's standards
          applied consistently.
        </Subtitle>
      </Header>

      <QueueGrid>
        {canModerateImages && (
          <QueueCard
            to="/moderation/images"
            aria-label={`Image Moderation, ${pendingImages} pending`}
          >
            <CardHeader>
              <CardIcon>
                <Image size={24} />
              </CardIcon>
              <PendingCount $empty={pendingImages === 0}>
                <PendingNumber>{pendingImages}</PendingNumber>
                <PendingLabel>Pending</PendingLabel>
              </PendingCount>
            </CardHeader>
            <CardTitle>Image Moderation</CardTitle>
            <CardDescription>
              Approve or reject artwork uploaded to characters and galleries.
              Flag anything that needs an NSFW marker.
            </CardDescription>
          </QueueCard>
        )}

        {canReviewTraits && (
          <QueueCard
            to="/moderation/traits"
            aria-label={`Trait Review, ${pendingTraits} pending`}
          >
            <CardHeader>
              <CardIcon>
                <ClipboardCheck size={24} />
              </CardIcon>
              <PendingCount $empty={pendingTraits === 0}>
                <PendingNumber>{pendingTraits}</PendingNumber>
                <PendingLabel>Pending</PendingLabel>
              </PendingCount>
            </CardHeader>
            <CardTitle>Trait Review</CardTitle>
            <CardDescription>
              Review proposed changes to character traits before they land on
              the registry, and edit them on the way through.
            </CardDescription>
          </QueueCard>
        )}
      </QueueGrid>
    </Container>
  );
};
