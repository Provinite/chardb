import React from "react";
import { Button, Cluster, type ButtonSize } from "@chardb/ui";
import { useAuth } from "../contexts/AuthContext";
import {
  useToggleFollowMutation,
  useGetFollowStatusQuery,
  GetFollowStatusDocument,
} from "../generated/graphql";
import toast from "react-hot-toast";
import * as styles from "./FollowButton.css";

interface FollowButtonProps {
  userId: string;
  showCount?: boolean;
  size?: ButtonSize;
  variant?: "default" | "compact";
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  showCount = true,
  size = "sm",
  variant = "default",
}) => {
  const { user } = useAuth();

  const { data: followData, loading: followLoading } = useGetFollowStatusQuery({
    variables: { userId },
    skip: !user || user.id === userId,
  });

  const [toggleFollow, { loading: toggleLoading }] = useToggleFollowMutation({
    variables: { input: { targetUserId: userId } },
    optimisticResponse: {
      toggleFollow: {
        __typename: "FollowResult",
        isFollowing: !followData?.followStatus?.isFollowing,
        followersCount: followData?.followStatus?.isFollowing
          ? (followData?.followStatus?.followersCount || 0) - 1
          : (followData?.followStatus?.followersCount || 0) + 1,
        followingCount: followData?.followStatus?.followingCount || 0,
        targetUserId: userId,
      },
    },
    update: (cache, { data }) => {
      if (data?.toggleFollow) {
        cache.writeQuery({
          query: GetFollowStatusDocument,
          variables: { userId },
          data: {
            followStatus: {
              __typename: "FollowStatus",
              isFollowing: data.toggleFollow.isFollowing,
              followersCount: data.toggleFollow.followersCount,
              followingCount: data.toggleFollow.followingCount,
            },
          },
        });
      }
    },
    onCompleted: (data) => {
      if (data?.toggleFollow) {
        toast.success(
          data.toggleFollow.isFollowing
            ? "Successfully followed user!"
            : "Successfully unfollowed user!",
        );
      }
    },
    onError: (error) => {
      toast.error(
        `Failed to ${followData?.followStatus?.isFollowing ? "unfollow" : "follow"} user: ${error.message}`,
      );
    },
  });

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error("Please log in to follow users");
      return;
    }

    if (user.id === userId) {
      toast.error("You cannot follow yourself");
      return;
    }

    try {
      await toggleFollow();
    } catch (error) {
      // Error handled by onError callback
    }
  };

  // Signed out, or on your own profile: nothing to follow.
  if (!user || user.id === userId) {
    return null;
  }

  const isFollowing = followData?.followStatus?.isFollowing || false;
  const followersCount = followData?.followStatus?.followersCount || 0;

  return (
    <Cluster gap="sm">
      <Button
        size={size}
        tone={isFollowing ? "ghost" : "primary"}
        className={isFollowing ? styles.following : undefined}
        onClick={handleToggleFollow}
        busy={toggleLoading}
        disabled={followLoading}
      >
        <span className={styles.labels}>
          <span className={isFollowing ? styles.inactiveLabel : styles.label}>
            Follow
          </span>
          <span className={isFollowing ? styles.label : styles.inactiveLabel}>
            Following
          </span>
        </span>
      </Button>

      {showCount && variant !== "compact" && (
        <span className={styles.count}>
          {followersCount} {followersCount === 1 ? "follower" : "followers"}
        </span>
      )}
    </Cluster>
  );
};

export default FollowButton;
