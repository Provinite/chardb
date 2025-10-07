/**
 * Configuration for resolving entity IDs from GraphQL arguments to check ownership.
 *
 * Similar to CommunityResolutionConfig but for ownership checks.
 * Supports dot notation for nested paths (e.g., 'input.characterId').
 */
export interface OwnershipResolutionConfig {
  /** Path to character ID in arguments */
  characterId?: string;
  /** Path to media ID in arguments */
  mediaId?: string;
  /** Path to gallery ID in arguments */
  galleryId?: string;
  /** Path to user ID in arguments (for self checks) */
  userId?: string;
}

export const AllOwnershipResolutionKeys = [
  "characterId",
  "mediaId",
  "galleryId",
  "userId",
] as const;

export type OwnershipResolutionReference = {
  type: keyof OwnershipResolutionConfig | null;
  value: string | null;
};
