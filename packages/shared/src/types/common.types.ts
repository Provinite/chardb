import { z } from 'zod';

export enum Visibility {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE',
}

export enum CommentableType {
  CHARACTER = 'CHARACTER',
  IMAGE = 'IMAGE',
  GALLERY = 'GALLERY',
  USER = 'USER',
}

export enum LikeableType {
  CHARACTER = 'CHARACTER',
  IMAGE = 'IMAGE',
  GALLERY = 'GALLERY',
  COMMENT = 'COMMENT',
}

export const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export interface Connection<T> {
  nodes: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}