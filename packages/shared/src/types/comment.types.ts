import { z } from 'zod';
import { CommentableType } from './common.types';

export const CommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(2000),
  authorId: z.string().uuid(),
  commentableType: z.nativeEnum(CommentableType),
  commentableId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  isHidden: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  commentableType: z.nativeEnum(CommentableType),
  commentableId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
});

export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const CommentSearchSchema = z.object({
  commentableType: z.nativeEnum(CommentableType),
  commentableId: z.string().uuid(),
  authorId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});

export type Comment = z.infer<typeof CommentSchema>;
export type CreateComment = z.infer<typeof CreateCommentSchema>;
export type UpdateComment = z.infer<typeof UpdateCommentSchema>;
export type CommentSearch = z.infer<typeof CommentSearchSchema>;