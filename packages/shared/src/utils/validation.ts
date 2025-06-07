import { z } from 'zod';

export const validateUUID = (value: string): boolean => {
  return z.string().uuid().safeParse(value).success;
};

export const validateEmail = (value: string): boolean => {
  return z.string().email().safeParse(value).success;
};

export const validateUsername = (value: string): boolean => {
  return z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).safeParse(value).success;
};

export const validatePassword = (value: string): boolean => {
  return z.string().min(8).max(100).safeParse(value).success;
};

export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};