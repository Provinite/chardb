import type { Role } from '../generated/graphql';

/**
 * Extract all permission keys (can* boolean fields) from the Role type.
 * This ensures type safety - if a new permission is added to the backend,
 * TypeScript will error until it's added to PERMISSIONS_MAP.
 */
export type PermissionKey = {
  [K in keyof Role]-?: K extends `can${string}`
    ? NonNullable<Role[K]> extends boolean ? K : never
    : never
}[keyof Role];

export type PermissionCategory = 'content' | 'community' | 'administration';

export interface PermissionInfo {
  name: string;
  description: string;
  category: PermissionCategory;
}

export interface Permission extends PermissionInfo {
  key: string;
}

/**
 * Permission definitions map - uses Record<PermissionKey, ...> with satisfies
 * to ensure ALL permission keys from the Role type are included.
 * TypeScript will error if any permission is missing.
 */
export const PERMISSIONS_MAP = {
  // Content Management
  canCreateSpecies: {
    name: 'Create Species',
    description: 'Allow creation of new species and their configuration',
    category: 'content',
  },
  canEditSpecies: {
    name: 'Edit Species',
    description: 'Allow editing existing species, traits, and variants',
    category: 'content',
  },
  canCreateCharacter: {
    name: 'Create Characters',
    description: 'Allow creation of new characters in the community',
    category: 'content',
  },
  canCreateOrphanedCharacter: {
    name: 'Create Orphaned Characters',
    description: 'Allow creation of characters without an owner (community/orphaned characters)',
    category: 'content',
  },
  canEditCharacter: {
    name: 'Edit Any Character (Profile)',
    description: "Allow editing profile fields (name, bio, visibility, trade settings) on any character",
    category: 'content',
  },
  canEditOwnCharacter: {
    name: 'Edit Own Characters (Profile)',
    description: 'Allow editing profile fields (name, bio, visibility, trade settings) on owned characters',
    category: 'content',
  },
  canEditCharacterRegistry: {
    name: 'Edit Any Character (Registry)',
    description: 'Allow editing registry fields (registry ID, variant, traits) on any character',
    category: 'content',
  },
  canEditOwnCharacterRegistry: {
    name: 'Edit Own Character (Registry)',
    description: 'Allow editing registry fields (registry ID, variant, traits) on owned characters',
    category: 'content',
  },
  canManageItems: {
    name: 'Manage Items',
    description: 'Allow creation, editing, and deletion of item types',
    category: 'content',
  },
  canGrantItems: {
    name: 'Grant Items',
    description: 'Allow granting items to community members',
    category: 'content',
  },
  canUploadOwnCharacterImages: {
    name: 'Upload Own Character Images',
    description: 'Allow uploading images to characters owned by the member',
    category: 'content',
  },
  canUploadCharacterImages: {
    name: 'Upload Any Character Images',
    description: 'Allow uploading images to any character in the community',
    category: 'content',
  },
  // Community Management
  canCreateInviteCode: {
    name: 'Create Invite Codes',
    description: 'Allow creation of community invitation codes',
    category: 'community',
  },
  canListInviteCodes: {
    name: 'View Invite Codes',
    description: 'Allow viewing and managing existing invite codes',
    category: 'community',
  },
  canRemoveCommunityMember: {
    name: 'Remove Members',
    description: 'Allow removal of community members',
    category: 'community',
  },
  canManageMemberRoles: {
    name: 'Manage Member Roles',
    description: 'Allow changing roles of community members',
    category: 'community',
  },
  // Role Administration
  canCreateRole: {
    name: 'Create Roles',
    description: 'Allow creation of new community roles',
    category: 'administration',
  },
  canEditRole: {
    name: 'Edit Roles',
    description: 'Allow editing existing community roles and permissions',
    category: 'administration',
  },
} as const satisfies Record<PermissionKey, PermissionInfo>;

/**
 * Get all permissions as an array
 */
export const ALL_PERMISSIONS: Permission[] = Object.entries(PERMISSIONS_MAP).map(
  ([key, info]) => ({
    key,
    ...info,
  })
);

/**
 * Get permissions filtered by category
 */
export const getPermissionsByCategory = (category: PermissionCategory): Permission[] =>
  ALL_PERMISSIONS.filter((p) => p.category === category);

/**
 * Permission key to display name mapping
 * Properly typed so TypeScript knows all keys are present
 */
export const PERMISSION_LABELS: { [K in PermissionKey]: string } = Object.keys(
  PERMISSIONS_MAP
).reduce(
  (acc, key) => {
    acc[key as PermissionKey] = PERMISSIONS_MAP[key as PermissionKey].name;
    return acc;
  },
  {} as { [K in PermissionKey]: string }
);

/**
 * Category metadata for UI display
 */
export const PERMISSION_CATEGORIES = {
  content: {
    id: 'content',
    title: 'Content Management',
    description: 'Permissions for managing community content and species',
  },
  community: {
    id: 'community',
    title: 'Community Management',
    description: 'Permissions for managing community members and invitations',
  },
  administration: {
    id: 'administration',
    title: 'Role Administration',
    description: 'Permissions for managing community roles and permissions',
  },
} as const;
