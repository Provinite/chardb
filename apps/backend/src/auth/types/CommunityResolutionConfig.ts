/**
 * Configuration for resolving community context from resolver arguments.
 *
 * Each property maps an entity type to the argument path where its ID can be found.
 * Paths support dot notation for nested objects (e.g., 'input.speciesId').
 */
export interface CommunityResolutionConfig {
  /** Path to character ID in arguments */
  characterId?: string;
  /** Path to species ID in arguments */
  speciesId?: string;
  /** Path to species variant ID in arguments */
  speciesVariantId?: string;
  /** Path to trait ID in arguments */
  traitId?: string;
  /** Path to enum value ID in arguments */
  enumValueId?: string;
  /** Path to enum value setting ID in arguments */
  enumValueSettingId?: string;
  /** Path to trait list entry ID in arguments */
  traitListEntryId?: string;
  /** Path to community ID in arguments (direct) */
  communityId?: string;
}

export const AllCommunityResolutionKeys = [
  "characterId",
  "speciesId",
  "speciesVariantId",
  "traitId",
  "enumValueId",
  "enumValueSettingId",
  "traitListEntryId",
  "communityId",
] as const;

export type CommunityResolutionReference =
  | {
      type: keyof CommunityResolutionConfig;
      value: string;
    }
  | {
      type: null;
      value: null;
    };

/**
 *
 * @param config
 * @returns
 */
export function resolutionConfigToReference(
  config: CommunityResolutionConfig,
): CommunityResolutionReference {
  for (const key of AllCommunityResolutionKeys) {
    if (config[key]) {
      return { type: key, value: config[key] };
    }
  }
  return { type: null, value: null };
}
