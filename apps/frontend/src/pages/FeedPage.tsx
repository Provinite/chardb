import React from "react";
import { useQuery } from "@apollo/client";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { LikeButton } from "../components/LikeButton";
import { GET_ACTIVITY_FEED } from "../graphql/social.graphql";
import { LikeableType } from "../generated/graphql";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ActivityCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ActivityHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background};
  border: 2px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.muted};
  flex-shrink: 0;
`;

const ActivityInfo = styled.div`
  flex: 1;
`;

const ActivityText = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`;

const ActivityTime = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const ContentPreview = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const ContentTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ContentDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ContentActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const ViewContentLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  opacity: 0.5;
`;

const EmptyTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  margin: 0 0 ${({ theme }) => theme.spacing.lg} 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const DiscoverButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.secondary};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xxl};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.error};
`;

const LoginPrompt = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const LoginPromptText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

export const FeedPage: React.FC = () => {
  const { user } = useAuth();

  const { data, loading, error } = useQuery(GET_ACTIVITY_FEED, {
    variables: {
      input: {
        limit: 20,
        offset: 0,
      },
    },
    skip: !user,
  });

  const activities = data?.activityFeed || [];

  if (!user) {
    return (
      <Container>
        <Header>
          <Title>Activity Feed</Title>
          <Subtitle>Stay updated with your network</Subtitle>
        </Header>

        <LoginPrompt>
          <LoginPromptText>
            Please log in to see activity from users you follow
          </LoginPromptText>
          <DiscoverButton to="/login">Log In</DiscoverButton>
        </LoginPrompt>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Activity Feed</Title>
          <Subtitle>Stay updated with your network</Subtitle>
        </Header>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>Activity Feed</Title>
          <Subtitle>Stay updated with your network</Subtitle>
        </Header>
        <ErrorContainer>
          <h3>Error loading activity feed</h3>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getActivityText = (activity: any) => {
    switch (activity.type) {
      case "CHARACTER_CREATED":
        return "created a new character";
      case "GALLERY_CREATED":
        return "created a new gallery";
      case "IMAGE_UPLOADED":
        return "uploaded a new image";
      case "CHARACTER_LIKED":
        return "liked a character";
      case "GALLERY_LIKED":
        return "liked a gallery";
      case "IMAGE_LIKED":
        return "liked an image";
      case "COMMENT_POSTED":
        return "posted a comment";
      default:
        return "had some activity";
    }
  };

  const getContentLink = (activity: any) => {
    switch (activity.type) {
      case "CHARACTER_CREATED":
      case "CHARACTER_LIKED":
        return `/character/${activity.entityId}`;
      case "GALLERY_CREATED":
      case "GALLERY_LIKED":
        return `/gallery/${activity.entityId}`;
      case "IMAGE_UPLOADED":
      case "IMAGE_LIKED":
        return `/media/${activity.entityId}`;
      default:
        return "#";
    }
  };

  const getLikeableType = (activity: any) => {
    switch (activity.type) {
      case "CHARACTER_CREATED":
      case "CHARACTER_LIKED":
        return LikeableType.Character;
      case "GALLERY_CREATED":
      case "GALLERY_LIKED":
        return LikeableType.Gallery;
      case "IMAGE_UPLOADED":
      case "IMAGE_LIKED":
        return LikeableType.Image;
      default:
        return LikeableType.Character;
    }
  };

  return (
    <Container>
      <Header>
        <Title>Activity Feed</Title>
        <Subtitle>Stay updated with your network</Subtitle>
      </Header>

      {activities.length === 0 ? (
        <EmptyState>
          <EmptyIcon>📡</EmptyIcon>
          <EmptyTitle>Your feed is empty</EmptyTitle>
          <EmptyDescription>
            Follow other users to see their activity here. Discover characters,
            galleries, and artwork from creators you're interested in!
          </EmptyDescription>
          <DiscoverButton to="/characters">Discover Content</DiscoverButton>
        </EmptyState>
      ) : (
        <FeedContainer>
          {activities.map((activity: any) => (
            <ActivityCard key={activity.id}>
              <ActivityHeader>
                <UserAvatar>
                  {activity.user.avatarUrl ? (
                    <img
                      src={activity.user.avatarUrl}
                      alt={activity.user.displayName || activity.user.username}
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    (
                      activity.user.displayName?.[0] ||
                      activity.user.username[0]
                    ).toUpperCase()
                  )}
                </UserAvatar>

                <ActivityInfo>
                  <ActivityText>
                    <Link
                      to={`/user/${activity.user.username}`}
                      style={{ color: "inherit", fontWeight: "bold" }}
                    >
                      {activity.user.displayName || activity.user.username}
                    </Link>{" "}
                    {getActivityText(activity)}
                  </ActivityText>
                  <ActivityTime>{formatTime(activity.createdAt)}</ActivityTime>
                </ActivityInfo>
              </ActivityHeader>

              {activity.content && (
                <ContentPreview>
                  <ContentTitle>
                    {activity.content.name || activity.content.title}
                  </ContentTitle>
                  {activity.content.description && (
                    <ContentDescription>
                      {activity.content.description}
                    </ContentDescription>
                  )}
                  <ContentActions>
                    <ViewContentLink to={getContentLink(activity)}>
                      View{" "}
                      {activity.type.includes("CHARACTER")
                        ? "Character"
                        : activity.type.includes("GALLERY")
                          ? "Gallery"
                          : "Image"}
                    </ViewContentLink>
                    <LikeButton
                      entityType={getLikeableType(activity)}
                      entityId={activity.entityId}
                      size="small"
                    />
                  </ContentActions>
                </ContentPreview>
              )}
            </ActivityCard>
          ))}
        </FeedContainer>
      )}
    </Container>
  );
};

export default FeedPage;
