import { z } from 'zod';
import { Visibility } from './common.types';

export const GallerySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  ownerId: z.string().uuid(),
  characterId: z.string().uuid().optional(),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  sortOrder: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateGallerySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  characterId: z.string().uuid().optional(),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  sortOrder: z.number().default(0),
});

export const UpdateGallerySchema = CreateGallerySchema.partial();

export const GallerySearchSchema = z.object({
  ownerId: z.string().uuid().optional(),
  characterId: z.string().uuid().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
});

export type Gallery = z.infer<typeof GallerySchema>;
export type CreateGallery = z.infer<typeof CreateGallerySchema>;
export type UpdateGallery = z.infer<typeof UpdateGallerySchema>;
export type GallerySearch = z.infer<typeof GallerySearchSchema>;