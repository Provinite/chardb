import { z } from 'zod';
import { Visibility } from './common.types';

export const ImageSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  originalFilename: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  altText: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  uploaderId: z.string().uuid(),
  characterId: z.string().uuid().optional(),
  galleryId: z.string().uuid().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  isNsfw: z.boolean().default(false),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateImageSchema = z.object({
  filename: z.string(),
  originalFilename: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  altText: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  characterId: z.string().uuid().optional(),
  galleryId: z.string().uuid().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  fileSize: z.number().positive(),
  mimeType: z.string(),
  isNsfw: z.boolean().default(false),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
});

export const UpdateImageSchema = z.object({
  altText: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  characterId: z.string().uuid().optional(),
  galleryId: z.string().uuid().optional(),
  isNsfw: z.boolean().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
});

export const ImageSearchSchema = z.object({
  uploaderId: z.string().uuid().optional(),
  characterId: z.string().uuid().optional(),
  galleryId: z.string().uuid().optional(),
  isNsfw: z.boolean().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
});

export type Image = z.infer<typeof ImageSchema>;
export type CreateImage = z.infer<typeof CreateImageSchema>;
export type UpdateImage = z.infer<typeof UpdateImageSchema>;
export type ImageSearch = z.infer<typeof ImageSearchSchema>;