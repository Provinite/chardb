import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '@thclone/ui';
import { useAuth } from '../contexts/AuthContext';
import { CREATE_COMMENT } from '../graphql/social';
import { CommentableType } from '../generated/graphql';
import toast from 'react-hot-toast';

const FormContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FormHeader = styled.div`
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

const FormTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: ${({ theme }) => theme.spacing.md};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  transition: border-color 0.2s ease-in-out;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const CharacterCount = styled.span<{ isOverLimit: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme, isOverLimit }) => 
    isOverLimit ? theme.colors.error : theme.colors.text.muted
  };
  margin-right: auto;
  padding-top: ${({ theme }) => theme.spacing.xs};
`;

const LoginPrompt = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const LoginPromptText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing.md} 0;
`;

interface CommentFormProps {
  entityType: CommentableType;
  entityId: string;
  parentId?: string;
  placeholder?: string;
  onCommentAdded?: () => void;
  onCancel?: () => void;
  compact?: boolean;
}

const MAX_COMMENT_LENGTH = 2000;

export const CommentForm: React.FC<CommentFormProps> = ({
  entityType,
  entityId,
  parentId,
  placeholder = "Write a comment...",
  onCommentAdded,
  onCancel,
  compact = false,
}) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createComment] = useMutation(CREATE_COMMENT, {
    onCompleted: () => {
      toast.success(parentId ? 'Reply posted successfully' : 'Comment posted successfully');
      setContent('');
      setIsSubmitting(false);
      onCommentAdded?.();
    },
    onError: (error) => {
      toast.error(`Failed to post comment: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    if (content.length > MAX_COMMENT_LENGTH) {
      toast.error(`Comment is too long. Maximum length is ${MAX_COMMENT_LENGTH} characters.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await createComment({
        variables: {
          input: {
            content: content.trim(),
            entityType,
            entityId,
            parentId,
          },
        },
      });
    } catch (error) {
      // Error handled by onError callback
    }
  };

  const handleCancel = () => {
    setContent('');
    onCancel?.();
  };

  const isOverLimit = content.length > MAX_COMMENT_LENGTH;
  const remainingChars = MAX_COMMENT_LENGTH - content.length;

  if (!user) {
    return (
      <LoginPrompt>
        <LoginPromptText>
          Please log in to leave a comment
        </LoginPromptText>
        <Button as="a" href="/login" variant="primary" size="sm">
          Log In
        </Button>
      </LoginPrompt>
    );
  }

  return (
    <FormContainer>
      {!compact && (
        <FormHeader>
          <UserAvatar>
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.displayName || user.username}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              (user.displayName?.[0] || user.username[0]).toUpperCase()
            )}
          </UserAvatar>
          <FormTitle>
            {parentId ? 'Write a reply' : 'Leave a comment'}
          </FormTitle>
        </FormHeader>
      )}

      <Form onSubmit={handleSubmit}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          disabled={isSubmitting}
          maxLength={MAX_COMMENT_LENGTH + 100} // Allow slight over-typing to show error
        />
        
        <FormActions>
          <CharacterCount isOverLimit={isOverLimit}>
            {remainingChars} characters remaining
          </CharacterCount>
          
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          
          <Button 
            type="submit" 
            variant="primary" 
            size="sm"
            disabled={isSubmitting || !content.trim() || isOverLimit}
          >
            {isSubmitting ? 'Posting...' : (parentId ? 'Reply' : 'Comment')}
          </Button>
        </FormActions>
      </Form>
    </FormContainer>
  );
};

export default CommentForm;