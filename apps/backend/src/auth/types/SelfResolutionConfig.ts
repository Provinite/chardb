/**
 * Configuration for resolving the target user ID to check against the current user.
 * Used by the SelfGuard to determine if the current user is accessing their own data.
 */
export interface SelfResolutionConfig {
  /**
   * Path to the user ID in GraphQL arguments (e.g., 'id', 'userId', 'input.userId').
   * If not specified, the guard will attempt to use the parent/root object's id.
   */
  userId?: string;
}

export const AllSelfResolutionKeys = ['userId'] as const;

export type SelfResolutionReference = {
  type: keyof SelfResolutionConfig | 'root' | null;
  value: string | null;
};
