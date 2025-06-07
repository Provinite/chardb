import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  displayName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  avatarUrl: z.string().url().optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
  dateOfBirth: z.date().optional(),
  isVerified: z.boolean().default(false),
  isAdmin: z.boolean().default(false),
  privacySettings: z.record(z.any()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().max(100).optional(),
});

export const UpdateUserSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
  dateOfBirth: z.date().optional(),
  privacySettings: z.record(z.any()).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type Login = z.infer<typeof LoginSchema>;