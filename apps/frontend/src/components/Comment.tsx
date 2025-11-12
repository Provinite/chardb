import React, { useState } from "react";
import { useMutation } from "@apollo/client";
import styled from "styled-components";
import { Button } from "@chardb/ui";
import { useAuth } from "../contexts/AuthContext";
import { UPDATE_COMMENT, DELETE_COMMENT } from "../graphql/social.graphql";
import { LikeButton } from "./LikeButton";
import { LikeableType } from "../generated/graphql";
import toast from "react-hot-toast";

const CommentContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== "isReply",
})<{ isReply?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, isReply }) =>
    isReply ? theme.colors.surface : theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-left: ${({ isReply, theme }) => (isReply ? theme.spacing.xl : "0")};
`;

const CommentHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const AuthorAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surface};
  border: 2px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  flex-shrink: 0;
`;

const AuthorInfo = styled.div`
  flex: 1;
`;

const AuthorName = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-right: ${({ theme }) => theme.spacing.sm};
`;

const CommentDate = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CommentActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const CommentContent = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  white-space: pre-wrap;
`;

const EditForm = styled.form`
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const EditTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: inherit;
  resize: vertical;
  margin-bottom: ${({ theme }) => theme.spacing.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CommentFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ReplyButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all 0.2s ease-in-out;

  &:hover {
    background: ${({ theme }) => theme.colors.primary + "20"};
  }
`;

interface CommentProps {
  comment: {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
    parentId?: string;
    isHidden: boolean;
    likesCount: number;
    author: {
      id: string;
      username: string;
      displayName?: string;
      avatarImage?: {
        id: string;
        originalUrl: string;
        thumbnailUrl?: string;
        altText?: string;
      };
    };
  };
  onReply?: (parentId: string) => void;
  onUpdate?: () => void;
  isReply?: boolean;
}

export const Comment: React.FC<CommentProps> = ({
  comment,
  onReply,
  onUpdate,
  isReply = false,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);

  const [updateComment] = useMutation(UPDATE_COMMENT, {
    onCompleted: () => {
      toast.success("Comment updated successfully");
      setIsEditing(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });

  const [deleteComment] = useMutation(DELETE_COMMENT, {
    onCompleted: () => {
      toast.success("Comment deleted successfully");
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      await updateComment({
        variables: {
          id: comment.id,
          input: {
            content: editContent.trim(),
          },
        },
      });
    } catch (error) {
      // Error handled by onError callback
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteComment({
        variables: { id: comment.id },
      });
    } catch (error) {
      // Error handled by onError callback
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
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
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const isOwner = user?.id === comment.authorId;

  if (comment.isHidden && !isOwner) {
    return null;
  }

  return (
    <CommentContainer isReply={isReply}>
      <CommentHeader>
        <AuthorAvatar>
          {comment.author.avatarImage ? (
            <img
              src={comment.author.avatarImage.thumbnailUrl || comment.author.avatarImage.originalUrl}
              alt={comment.author.avatarImage.altText || comment.author.displayName || comment.author.username}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            (
              comment.author.displayName?.[0] || comment.author.username[0]
            ).toUpperCase()
          )}
        </AuthorAvatar>

        <AuthorInfo>
          <AuthorName>
            {comment.author.displayName || comment.author.username}
          </AuthorName>
          <CommentDate>{formatDate(comment.createdAt)}</CommentDate>
        </AuthorInfo>

        {isOwner && (
          <CommentActions>
            <ActionButton onClick={handleEdit} disabled={isDeleting}>
              Edit
            </ActionButton>
            <ActionButton onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </ActionButton>
          </CommentActions>
        )}
      </CommentHeader>

      {isEditing ? (
        <EditForm onSubmit={handleSaveEdit}>
          <EditTextarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edit your comment..."
            autoFocus
          />
          <EditActions>
            <Button type="submit" variant="primary" size="sm">
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
          </EditActions>
        </EditForm>
      ) : (
        <CommentContent>{comment.content}</CommentContent>
      )}

      <CommentFooter>
        <CommentMeta>
          <LikeButton
            entityType={LikeableType.Comment}
            entityId={comment.id}
            size="small"
          />
          {onReply && !isReply && (
            <ReplyButton onClick={() => onReply(comment.id)}>Reply</ReplyButton>
          )}
        </CommentMeta>
      </CommentFooter>
    </CommentContainer>
  );
};

export default Comment;
