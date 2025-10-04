# GraphQL Permissions Audit

**Date:** 2025-10-03
**Issue:** #63 - Implement comprehensive permissioning system for all GraphQL operations
**Schema Source:** `/home/prov/dev/clovercoin/thclone/apps/backend/src/schema.gql`

## Executive Summary

### Current State
- **Total Queries:** 88
- **Total Mutations:** 65
- **Current Permission Implementation:** ❌ **MINIMAL**
  - Only basic authentication guards (`JwtAuthGuard`, `OptionalJwtAuthGuard`)
  - No role-based access control
  - No ownership-based authorization
  - No fine-grained permissions
  - No systematic permission checks in resolvers

### Critical Findings
1. ⚠️ **No authorization** - Only authentication (checking if user is logged in)
2. ⚠️ **No ownership checks** - Users might access/modify resources they don't own
3. ⚠️ **No role-based access** - Community roles exist but aren't enforced
4. ⚠️ **Inconsistent guards** - Some queries require auth, others don't (no clear pattern)
5. ⚠️ **Field-level permissions missing** - Object fields with custom resolvers lack permission checks

---

## Mutations (65 total)

### Authentication & User Management (5)
| Mutation | Auth Required | Current Permissions | Needed Permissions | Proposed Permission Logic |
|----------|---------------|---------------------|-------------------|---------------------------|
| `login` | ❌ Public | None | Public | **Public** - No authentication required |
| `signup` | ❌ Public | None | Public + Invite Code Validation | **Public** - Validate invite code exists, has available claims (`claimCount < maxClaims`), grant role from code if present |
| `refreshToken` | ❌ Public | None | Valid Refresh Token | **Public** - Validate refresh token is valid and not expired |
| `deleteAccount` | ✅ JWT | Basic Auth | Authenticated + Self-Only | **Authenticated** - User can only delete their own account (implicit self from JWT) |
| `updateProfile` | ✅ JWT | Basic Auth | Authenticated + Self-Only | **Authenticated** - User can only update their own profile (implicit self from JWT) |

### Character Management (10)
| Mutation | Auth Required | Current Permissions | Proposed Permission Logic |
|----------|---------------|---------------------|---------------------------|
| `createCharacter` | ✅ JWT | Basic Auth | **Authenticated** + If has species: role `canCreateCharacter` (via species→community). If no species: authenticated only |
| `updateCharacter` | ✅ JWT | Basic Auth | **Authenticated** + If owner: role `canEditOwnCharacter`. If not owner: role `canEditCharacter`. (Resolve via character→species→community or global) |
| `deleteCharacter` | ✅ JWT | Basic Auth | **Authenticated** + If owner: role `canEditOwnCharacter`. If not owner: role `canEditCharacter`. (Resolve via character→species→community or global) |
| `transferCharacter` | ✅ JWT | Basic Auth | **Authenticated** + **Owner only** (no role check, must own character) |
| `setCharacterMainMedia` | ✅ JWT | Basic Auth | **Authenticated** + If owner: role `canEditOwnCharacter`. If not owner: role `canEditCharacter`. (Resolve via character→species→community or global) |
| `updateCharacterTraits` | ✅ JWT | Basic Auth | **Authenticated** + Role `canEditCharacter` (community via character→species→community). Note: Non-species characters have no traits. canEditOwnCharacter does NOT apply |
| `addCharacterTags` | ✅ JWT | Basic Auth | **Authenticated** + If owner: role `canEditOwnCharacter`. If not owner: role `canEditCharacter`. (Resolve via character→species→community or global) |
| `removeCharacterTags` | ✅ JWT | Basic Auth | **Authenticated** + If owner: role `canEditOwnCharacter`. If not owner: role `canEditCharacter`. (Resolve via character→species→community or global) |
| `createCharacterOwnershipChange` | ✅ JWT | Basic Auth | **Global Admin only** (`isAdmin: true`) - Manual audit trail creation |
| `removeCharacterOwnershipChange` | ✅ JWT | Basic Auth | **Global Admin only** (`isAdmin: true`) - Manual audit trail removal |

### Media & Gallery Management (12)
| Mutation | Auth Required | Current Permissions | Proposed Permission Logic |
|----------|---------------|---------------------|---------------------------|
| `createTextMedia` | ✅ JWT | Basic Auth | **Authenticated** - Any authenticated user can create text media |
| `updateMedia` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** |
| `deleteMedia` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** |
| `addMediaTags` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** |
| `removeMediaTags` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** |
| `createGallery` | ✅ JWT | Basic Auth | **Authenticated** - Any authenticated user can create a gallery |
| `updateGallery` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** |
| `deleteGallery` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** |
| `reorderGalleries` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** (reordering own galleries) |
| `updateImage` | ✅ JWT | Basic Auth | **Authenticated** + **Uploader (owner) OR Global Admin** |
| `deleteImage` | ✅ JWT | Basic Auth | **Authenticated** + **Uploader (owner) OR Global Admin** |
| `updateTextContent` | ✅ JWT | Basic Auth | **Authenticated** + **Owner OR Global Admin** |

### Comment & Social (5)
| Mutation | Auth Required | Current Permissions | Proposed Permission Logic |
|----------|---------------|---------------------|---------------------------|
| `createComment` | ✅ JWT | Basic Auth | **Authenticated** - Any authenticated user can create a comment |
| `updateComment` | ✅ JWT | Basic Auth | **Authenticated** + **Author OR Global Admin** |
| `deleteComment` | ✅ JWT | Basic Auth | **Authenticated** + **Author OR Global Admin OR Owner of commentable entity** |
| `toggleLike` | ✅ JWT | Basic Auth | **Authenticated** - Any authenticated user can like/unlike content |
| `toggleFollow` | ✅ JWT | Basic Auth | **Authenticated** - Any authenticated user can follow/unfollow other users |

### Community Management (9)
| Mutation | Auth Required | Current Permissions | Proposed Permission Logic |
|----------|---------------|---------------------|---------------------------|
| `createCommunity` | ✅ JWT | Basic Auth | **Authenticated** + Global permission `canCreateCommunity` |
| `updateCommunity` | ❓ Unknown | Unknown | **Authenticated** + Global permission `canCreateCommunity` |
| `removeCommunity` | ❓ Unknown | Unknown | **Authenticated** + Global permission `canCreateCommunity` |
| `createCommunityMember` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin only** (`isAdmin: true`) |
| `updateCommunityMember` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin only** (`isAdmin: true`) |
| `removeCommunityMember` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Self (to leave) OR Community role `canRemoveCommunityMember`** (Note: Add `canRemoveCommunityMember` to Role entity) |
| `createCommunityInvitation` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canCreateInviteCode`** |
| `respondToCommunityInvitation` | ❓ Unknown | Unknown | **Authenticated** + **Invitee only** |
| `removeCommunityInvitation` | ❓ Unknown | Unknown | **Authenticated** + **Inviter OR Invitee OR Global Admin** |

### Role & Permission Management (7)
| Mutation | Auth Required | Current Permissions | Proposed Permission Logic |
|----------|---------------|---------------------|---------------------------|
| `createRole` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canCreateRole`** |
| `updateRole` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditRole`** |
| `removeRole` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditRole`** |
| `createInviteCode` | ❓ Unknown | Unknown | **Authenticated** + Global permission `canCreateInviteCode`. **Note: Refactor to `createGlobalInviteCode`** (community invites use `createCommunityInvitation`) |
| `updateInviteCode` | ❓ Unknown | Unknown | **Authenticated** + Global permission `canCreateInviteCode` |
| `removeInviteCode` | ❓ Unknown | Unknown | **Authenticated** + Global permission `canCreateInviteCode` |
| `claimInviteCode` | ❓ Unknown | Unknown | **Authenticated** + Validate code exists and has available claims (`claimCount < maxClaims`), grant associated role |

### Species & Trait Management (17)
| Mutation | Auth Required | Current Permissions | Proposed Permission Logic |
|----------|---------------|---------------------|---------------------------|
| `createSpecies` | ❓ Unknown | Unknown | **Authenticated** + Community role `canCreateSpecies` (via communityId in input) |
| `updateSpecies` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via species→communityId) |
| `removeSpecies` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via species→communityId) |
| `createSpeciesVariant` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via speciesId→species→communityId) |
| `updateSpeciesVariant` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via variant→species→communityId) |
| `removeSpeciesVariant` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via variant→species→communityId) |
| `createTrait` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via speciesId→species→communityId) |
| `updateTrait` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via trait→species→communityId) |
| `removeTrait` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via trait→species→communityId) |
| `createEnumValue` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via traitId→trait→species→communityId) |
| `updateEnumValue` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via enumValue→trait→species→communityId) |
| `removeEnumValue` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via enumValue→trait→species→communityId) |
| `createEnumValueSetting` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via speciesVariantId→variant→species→communityId) |
| `updateEnumValueSetting` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via enumValueSetting→variant→species→communityId) |
| `removeEnumValueSetting` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via enumValueSetting→variant→species→communityId) |
| `createTraitListEntry` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via speciesVariantId→variant→species→communityId) |
| `updateTraitListEntry` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via traitListEntry→variant→species→communityId) |
| `removeTraitListEntry` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Community role `canEditSpecies`** (via traitListEntry→variant→species→communityId) |

---

## Queries (88 total)

### User & Profile Queries (8)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `me` | ✅ JWT | Authenticated | **Authenticated** - Returns current user |
| `user` | ❓ Optional | Optional | **Public** (optional auth) - Field-level privacy filtering applied |
| `users` | ❓ Unknown | Unknown | **Authenticated** + Global permission `canListUsers` |
| `userProfile` | ❓ Optional | Optional | **Public** (optional auth) - Privacy-filtered based on viewer/owner status |
| `userStats` | ❓ Unknown | Unknown | **Public** (optional auth) - Privacy-filtered stats based on user settings |
| `getFollowers` | ❓ Unknown | Unknown | **Public** (optional auth) - Privacy-filtered based on user settings |
| `getFollowing` | ❓ Unknown | Unknown | **Public** (optional auth) - Privacy-filtered based on user settings |
| `followStatus` | ❓ Unknown | Unknown | **Authenticated** - Check follow status between current user and target |

### Character Queries (8)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `character` | ❓ Optional | Optional | **Public** (optional auth) - Visibility-based: PUBLIC (anyone), UNLISTED (anyone with link), PRIVATE (owner OR appropriate community permissions) |
| `characters` | ❓ Optional | Optional | **Public** (optional auth) - Returns PUBLIC characters only |
| `myCharacters` | ✅ JWT | Authenticated | **Authenticated** - Returns all characters owned by current user (all visibility levels) |
| `userCharacters` | ❓ Optional | Optional | **Public** (optional auth) - If viewer is owner: all characters. Otherwise: PUBLIC only |
| `characterOwnershipChangeById` | ❓ Unknown | Unknown | **Authenticated** - Any authenticated user can view |
| `characterOwnershipChanges` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin only** (`isAdmin: true`) |
| `characterOwnershipChangesByCharacter` | ❓ Unknown | Unknown | **Authenticated** - Any authenticated user can view ownership changes for a specific character |
| `characterOwnershipChangesByUser` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin OR Self** (userId matches current user) |

### Media & Gallery Queries (21)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `media` | ❓ Unknown | Unknown | **Public** (optional auth) - Returns PUBLIC media only |
| `mediaItem` | ❓ Unknown | Unknown | **Public** (optional auth) - Visibility-based: PUBLIC (anyone), UNLISTED (anyone with link), PRIVATE (owner only) |
| `myMedia` | ✅ JWT | Authenticated | **Authenticated** - Returns all media owned by current user (all visibility levels) |
| `userMedia` | ❓ Unknown | Unknown | **Public** (optional auth) - If viewer is owner: all media. Otherwise: PUBLIC only |
| `characterMedia` | ❓ Unknown | Unknown | **Public** (optional auth) - Based on character visibility: if character accessible, show media (filtered by media visibility) |
| `galleryMedia` | ❓ Unknown | Unknown | **Public** (optional auth) - Based on gallery visibility: if gallery accessible, show media (filtered by media visibility) |
| `likedMedia` | ❓ Unknown | Unknown | **Authenticated** - Returns media liked by current user (respects media visibility) |
| `image` | ❓ Unknown | Unknown | **BLOCKED** (always reject) - Deprecated in favor of media queries |
| `images` | ❓ Unknown | Unknown | **BLOCKED** (always reject) - Deprecated in favor of media queries |
| `myImages` | ✅ JWT | Authenticated | **BLOCKED** (always reject) - Deprecated in favor of media queries |
| `userImages` | ❓ Unknown | Unknown | **BLOCKED** (always reject) - Deprecated in favor of media queries |
| `characterImages` | ❓ Unknown | Unknown | **BLOCKED** (always reject) - Deprecated in favor of media queries |
| `galleryImages` | ❓ Unknown | Unknown | **BLOCKED** (always reject) - Deprecated in favor of media queries |
| `gallery` | ❓ Unknown | Unknown | **Public** (optional auth) - Visibility-based: PUBLIC (anyone), UNLISTED (anyone with link), PRIVATE (owner only) |
| `galleries` | ❓ Unknown | Unknown | **Public** (optional auth) - Returns PUBLIC galleries only |
| `myGalleries` | ✅ JWT | Authenticated | **Authenticated** - Returns all galleries owned by current user (all visibility levels) |
| `userGalleries` | ❓ Unknown | Unknown | **Public** (optional auth) - If viewer is owner: all galleries. Otherwise: PUBLIC only |
| `characterGalleries` | ❓ Unknown | Unknown | **Public** (optional auth) - Based on character visibility: if character accessible, show galleries (filtered by gallery visibility) |
| `likedCharacters` | ❓ Unknown | Unknown | **Authenticated** - Returns characters liked by current user (respects character visibility) |
| `likedGalleries` | ❓ Unknown | Unknown | **Authenticated** - Returns galleries liked by current user (respects gallery visibility) |
| `likedImages` | ❓ Unknown | Unknown | **BLOCKED** (always reject) - Deprecated in favor of `likedMedia` |

### Comment & Social Queries (4)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `comment` | ❓ Unknown | Unknown | **Public** (optional auth) - Based on commentable entity visibility: if entity accessible, show comment |
| `comments` | ❓ Unknown | Unknown | **Public** (optional auth) - Returns comments for accessible entities only |
| `likeStatus` | ❓ Unknown | Unknown | **Authenticated** - Returns like count and whether current user has liked the entity |
| `activityFeed` | ❓ Unknown | Unknown | **Authenticated** - Returns activity feed for current user |

### Community Queries (11)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `communities` | ❓ Unknown | Unknown | **Authenticated** - Returns only communities current user has access to (is member of) |
| `community` | ❓ Unknown | Unknown | **Authenticated** - Returns community if user is member, otherwise reject |
| `communityMemberById` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin only** (`isAdmin: true`) |
| `communityMembers` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin only** (`isAdmin: true`) |
| `communityMembersByCommunity` | ❓ Unknown | Unknown | **Authenticated** + **Community member of that community OR Global Admin** |
| `communityMembersByUser` | ❓ Unknown | Unknown | **Authenticated** + **Self (userId matches current user) OR Global Admin** |
| `communityInvitationById` | ❓ Unknown | Unknown | **Authenticated** + **Invitee OR Inviter OR Community role `canCreateInviteCode` (via invitation→community) OR Global Admin** |
| `communityInvitations` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin only** (`isAdmin: true`) |
| `communityInvitationsByCommunity` | ❓ Unknown | Unknown | **Authenticated** + **Community role `canCreateInviteCode` OR Global Admin** |
| `communityInvitationsByInvitee` | ❓ Unknown | Unknown | **Authenticated** + **Self (inviteeId matches current user) OR Global Admin** |
| `communityInvitationsByInviter` | ❓ Unknown | Unknown | **Authenticated** + **Self (inviterId matches current user) OR Global Admin** |

### Role & Invite Code Queries (7)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `roleById` | ❓ Unknown | Unknown | **Authenticated** + **Community member (of role's community) OR Global Admin** |
| `roles` | ❓ Unknown | Unknown | **Authenticated** + **Global Admin only** (`isAdmin: true`) |
| `rolesByCommunity` | ❓ Unknown | Unknown | **Authenticated** + **Community member of that community OR Global Admin** |
| `inviteCodeById` | ❓ Unknown | Unknown | **Authenticated** + **Global permission `canListInviteCodes` OR Global Admin** |
| `inviteCodes` | ❓ Unknown | Unknown | **Authenticated** + If communityId null: Global permission `canListInviteCodes` OR Global Admin. If communityId provided: Community role `canListInviteCodes` OR Global Admin |
| `inviteCodesByCreator` | ❓ Unknown | Unknown | **Authenticated** + For global codes: Global permission `canListInviteCodes` OR Global Admin. For community codes: Community role `canListInviteCodes` OR Global Admin |
| `inviteCodesByRole` | ❓ Unknown | Unknown | **Authenticated** + **Community role `canListInviteCodes` (for the role's community) OR Global Admin** |

### Species & Trait Queries (20)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `species` | ❓ Unknown | Unknown | **Authenticated** + **Community member (of the species' community) OR Global Admin** |
| `speciesById` | ❓ Unknown | Unknown | **Authenticated** + **Community member (of the species' community) OR Global Admin** |
| `speciesByCommunity` | ❓ Unknown | Unknown | **Authenticated** + **Community member (of that community) OR Global Admin** |
| `speciesVariantById` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via variant→species→community) OR Global Admin** |
| `speciesVariants` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via variant→species→community) OR Global Admin** |
| `speciesVariantsBySpecies` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via species→community) OR Global Admin** |
| `traitById` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via trait→species→community) OR Global Admin** |
| `traits` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via trait→species→community) OR Global Admin** |
| `traitsBySpecies` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via species→community) OR Global Admin** |
| `enumValueById` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via enumValue→trait→species→community) OR Global Admin** |
| `enumValues` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via enumValue→trait→species→community) OR Global Admin** |
| `enumValuesByTrait` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via trait→species→community) OR Global Admin** |
| `enumValueSettingById` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via enumValueSetting→variant→species→community) OR Global Admin** |
| `enumValueSettings` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via enumValueSetting→variant→species→community) OR Global Admin** |
| `enumValueSettingsByEnumValue` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via enumValue→trait→species→community) OR Global Admin** |
| `enumValueSettingsBySpeciesVariant` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via variant→species→community) OR Global Admin** |
| `traitListEntryById` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via traitListEntry→variant→species→community) OR Global Admin** |
| `traitListEntries` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via traitListEntry→variant→species→community) OR Global Admin** |
| `traitListEntriesBySpeciesVariant` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via variant→species→community) OR Global Admin** |
| `traitListEntriesByTrait` | ❓ Unknown | Unknown | **Authenticated** + **Community member (via trait→species→community) OR Global Admin** |

### Tag Queries (1)
| Query | Auth Required | Current Permissions | Proposed Permission Logic |
|-------|---------------|---------------------|---------------------------|
| `searchTags` | ❓ Unknown | Unknown | **Public** (optional auth) - Returns tag suggestions/search results |

---

## Object Type Fields Requiring Permissions

### User Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `email` | **Self OR Global Admin** |
| `dateOfBirth` | **Self OR Global Admin** |
| `privacySettings` | **Self OR Global Admin** |
| `canCreateCommunity` | **Self OR Global Admin** |
| `canCreateInviteCode` | **Self OR Global Admin** |
| `canGrantGlobalPermissions` | **Self OR Global Admin** |
| `canListInviteCodes` | **Self OR Global Admin** |
| `canListUsers` | **Self OR Global Admin** |
| `isAdmin` | **Public** |
| `followersCount` | **Public** |
| `followingCount` | **Public** |
| `userIsFollowing` | **Authenticated** |

### UserProfile Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `canViewPrivateContent` | Calculated field (no explicit permissions) |
| `isOwnProfile` | Calculated field (no explicit permissions) |
| `featuredCharacters` | Visibility-filtered (no explicit field permissions) |
| `recentCharacters` | Visibility-filtered (no explicit field permissions) |
| `recentGalleries` | Visibility-filtered (no explicit field permissions) |
| `recentMedia` | Visibility-filtered (no explicit field permissions) |

### Character Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `creator` | **Public** (no special permissions) |
| `owner` | **Public** (no special permissions) |
| `traitValues` | **Public** (no special permissions - if you can see character, you can see traits) |
| `userHasLiked` | **Authenticated** |
| `likesCount` | **Public** |

### Media Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `owner` | **Public** (no special permissions) |
| `userHasLiked` | **Authenticated** |
| `likesCount` | **Public** |

### Gallery Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `owner` | **Public** (no special permissions) |
| `userHasLiked` | **Authenticated** |
| `likesCount` | **Public** |

### Image Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `artist` | **Public** (no special permissions) |
| `uploader` | **Public** (no special permissions) |
| `userHasLiked` | **Authenticated** |
| `url` | **Public** (no special permissions - NSFW/content warnings separate from permissions) |

### Comment Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `author` | **Public** (no special permissions) |
| `isHidden` | **Public** |
| `userHasLiked` | **Authenticated** |
| `replies` | Visibility-filtered same as comments (no explicit field permissions) |

### InviteCode Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `creator` | **Global permission `canListInviteCodes` OR Global Admin** |
| `claimCount` | **Global permission `canListInviteCodes` OR Global Admin** |
| `remainingClaims` | **Public** (calculated - users need to know if valid) |
| `isAvailable` | **Public** (calculated - users need to know if usable) |

### CommunityInvitation Type
| Field | Proposed Permission Logic |
|-------|---------------------------|
| `inviter` | **Public** (no special permissions - if you can see invitation, you can see who's involved) |
| `invitee` | **Public** (no special permissions - if you can see invitation, you can see who's involved) |

---

## Summary of Required Changes

### New Role Permissions to Add
The following permissions need to be added to the `Role` entity:
- `canRemoveCommunityMember` - Allow role holders to remove members from the community

### Mutations to Refactor
- `createInviteCode` → Rename to `createGlobalInviteCode` for clarity (community invites use `createCommunityInvitation`)

### Deprecated Queries (Block All Access)
The following image-related queries should be blocked (always reject):
- `image`
- `images`
- `myImages`
- `userImages`
- `characterImages`
- `galleryImages`
- `likedImages`

These are deprecated in favor of the unified media queries.

---

## Recommended Permission Architecture

### 1. Permission Decorators/Guards
```typescript
// Proposed decorators:
@RequireAuth() // Must be authenticated
@RequireOwnership(entityType, idParam) // Must own the resource
@RequireRole(permission) // Must have role permission
@RequireGlobalPermission(permission) // Must have global permission
@RequireAdmin() // Must be admin
@Public() // Explicitly public (no auth needed)
@OptionalAuth() // Auth optional, but user context provided if available
```

### 2. Permission Hierarchy
1. **Public** - No authentication required
2. **Authenticated** - Valid user session required
3. **Owner** - Resource ownership required
4. **Role-Based** - Specific community role permission required
5. **Admin** - Administrative privileges required

### 3. Visibility System
- Implement consistent visibility checks across all queries
- Support visibility levels: PUBLIC, UNLISTED, PRIVATE
- Owner always sees their own content regardless of visibility
- Admins may have override permissions

---

## Priority Implementation Order

### Phase 1: Critical Security (Immediate)
1. **Character mutations** - Prevent unauthorized character modification/deletion
2. **User data** - Protect email, DOB, privacy settings
3. **Media/Gallery mutations** - Ownership-based protection
4. **Account deletion** - Self-only restriction

### Phase 2: Community Permissions (High Priority)
1. **Community management** - Admin/owner restrictions
2. **Role management** - Proper role-based access
3. **Invite codes** - Permission-based creation/viewing
4. **Species/Trait management** - Role-based species editing

### Phase 3: Fine-grained Access (Medium Priority)
1. **Visibility filtering** - Proper query filtering
2. **Field-level permissions** - Sensitive field protection
3. **Comment moderation** - Proper delete permissions
4. **Transfer restrictions** - Character transfer rules

### Phase 4: Social & Advanced (Lower Priority)
1. **Privacy settings** - User-configurable privacy
2. **Like/Follow permissions** - Social interaction rules
3. **Activity feed** - Privacy-aware feed
4. **Tag management** - Appropriate tag restrictions

---

## Security Risks (Current State)

### 🔴 Critical
- Any authenticated user can likely modify/delete ANY character
- Any authenticated user can likely modify/delete ANY gallery/media
- User email and personal data may be exposed
- No community role enforcement - users could bypass permissions
- Species/trait data might be modifiable by unauthorized users

### 🟠 High
- Invite code system may not properly enforce claim limits
- Character ownership changes might not be properly restricted
- Community invitations could be manipulated
- Role permissions exist in schema but aren't enforced

### 🟡 Medium
- Visibility settings may not be properly enforced
- Like/follow operations may lack validation
- Comment moderation insufficient
- Tag manipulation possible

---

## Next Steps

1. ✅ Complete this audit (DONE)
2. ⏭️ Design comprehensive permission system architecture
3. ⏭️ Implement core authorization framework (guards, decorators, utilities)
4. ⏭️ Apply permissions to all mutations (starting with Phase 1)
5. ⏭️ Apply permissions to all queries
6. ⏭️ Implement field-level resolvers with permission checks
7. ⏭️ Write comprehensive tests
8. ⏭️ Security audit and penetration testing
9. ⏭️ Documentation and developer guide

---

## Notes
- This audit was generated from the GraphQL schema file: `apps/backend/src/schema.gql`
- Current implementation verified through code analysis of resolver files
- ❌ = No auth, ✅ = Auth required, ❓ = Unknown/Inconsistent
- Many operations marked "Unknown" because they lack guard decorators or implementation is inconsistent
