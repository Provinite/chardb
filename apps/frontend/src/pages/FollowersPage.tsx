import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import styled from "styled-components";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { FollowButton } from "../components/FollowButton";
import { GET_FOLLOWERS } from "../graphql/social.graphql";

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  text-decoration: none;
  transition: all 0.2s;
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &::before {
    content: "←";
    font-weight: bold;
  }
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

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const UserAvatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.background};
  border: 2px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text.muted};
  flex-shrink: 0;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin: 0 0 ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Username = styled(Link)`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-decoration: none;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  display: block;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const UserBio = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const UserActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
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
  margin: 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
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

export const FollowersPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();

  const { data, loading, error } = useQuery(GET_FOLLOWERS, {
    variables: { username: username! },
    skip: !username,
  });

  const followers = data?.getFollowers?.followers || [];
  const user = data?.getFollowers?.user;

  if (loading) {
    return (
      <Container>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error || (data && !user)) {
    return (
      <Container>
        <ErrorContainer>
          <h3>Error loading followers</h3>
          <p>{error?.message || "User not found"}</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton to={`/user/${username}`}>Back to Profile</BackButton>

      <Header>
        <Title>{user.displayName || user.username}'s Followers</Title>
        <Subtitle>
          {followers.length} {followers.length === 1 ? "follower" : "followers"}
        </Subtitle>
      </Header>

      {followers.length === 0 ? (
        <EmptyState>
          <EmptyIcon>👥</EmptyIcon>
          <EmptyTitle>No followers yet</EmptyTitle>
          <EmptyDescription>
            This user doesn't have any followers yet. Be the first to follow
            them!
          </EmptyDescription>
        </EmptyState>
      ) : (
        <UserList>
          {followers.map((follower: any) => (
            <UserCard key={follower.id}>
              <UserAvatar>
                {follower.avatarUrl ? (
                  <img
                    src={follower.avatarUrl}
                    alt={follower.displayName || follower.username}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  (
                    follower.displayName?.[0] || follower.username[0]
                  ).toUpperCase()
                )}
              </UserAvatar>

              <UserInfo>
                <UserName>{follower.displayName || follower.username}</UserName>
                <Username to={`/user/${follower.username}`}>
                  @{follower.username}
                </Username>
                {follower.bio && <UserBio>{follower.bio}</UserBio>}
              </UserInfo>

              <UserActions>
                <FollowButton
                  userId={follower.id}
                  showCount={false}
                  size="sm"
                  variant="compact"
                />
              </UserActions>
            </UserCard>
          ))}
        </UserList>
      )}
    </Container>
  );
};

export default FollowersPage;
