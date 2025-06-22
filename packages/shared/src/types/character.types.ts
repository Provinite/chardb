import { z } from 'zod';
import { Visibility } from './common.types';

export const CharacterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  species: z.string().max(50).optional(),
  age: z.string().max(20).optional(),
  gender: z.string().max(30).optional(),
  description: z.string().max(5000).optional(),
  personality: z.string().max(3000).optional(),
  backstory: z.string().max(5000).optional(),
  ownerId: z.string().uuid(),
  creatorId: z.string().uuid().optional(),
  mainImageId: z.string().uuid().optional(),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  isSellable: z.boolean().default(false),
  isTradeable: z.boolean().default(false),
  price: z.number().positive().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.string().max(50).optional(),
  age: z.string().max(20).optional(),
  gender: z.string().max(30).optional(),
  description: z.string().max(5000).optional(),
  personality: z.string().max(3000).optional(),
  backstory: z.string().max(5000).optional(),
  visibility: z.nativeEnum(Visibility).default(Visibility.PUBLIC),
  isSellable: z.boolean().default(false),
  isTradeable: z.boolean().default(false),
  price: z.number().positive().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.any()).default({}),
});

export const UpdateCharacterSchema = CreateCharacterSchema.partial().extend({
  mainImageId: z.string().uuid().optional(),
});

export const CharacterSearchSchema = z.object({
  search: z.string().optional(),
  species: z.string().optional(),
  tags: z.array(z.string()).optional(),
  ownerId: z.string().uuid().optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  isSellable: z.boolean().optional(),
  isTradeable: z.boolean().optional(),
});

export type Character = z.infer<typeof CharacterSchema>;
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;
export type UpdateCharacter = z.infer<typeof UpdateCharacterSchema>;
export type CharacterSearch = z.infer<typeof CharacterSearchSchema>;