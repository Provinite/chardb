# GitHub Issue #125: Orphaned Characters & Pending Ownership - Implementation Status

**Issue**: Add ability to create orphaned characters
**Branch**: `feat/gh-125-orphaned-characters`
**Status**: Backend Complete ✅ | Frontend Pending 📋

---

## Overview

This feature enables:
1. Characters/items with no owner (orphaned/community-owned)
2. Characters/items with PENDING ownership tied to external accounts (Discord, DeviantArt)
3. Automatic claiming of pending items when users link external accounts
4. Permission-gated creation of orphaned characters via `canCreateOrphanedCharacter`

---

## ✅ COMPLETED - Backend Implementation

### Phase 1: Database Layer

**Files Modified:**
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20251101033053_add_orphaned_characters_and_pending_ownership/migration.sql`

**Changes:**
1. Made `Character.ownerId` nullable (`String?`)
2. Made `Item.ownerId` nullable (`String?`)
3. Created `PendingOwnership` model with:
   - Proper foreign keys to `Character` and `Item` (with CASCADE delete)
   - Unique constraints ensuring one pending ownership per entity
   - Index on `(provider, providerAccountId)` for efficient lookups
   - Database CHECK constraint: `(character_id IS NOT NULL AND item_id IS NULL) OR (character_id IS NULL AND item_id IS NOT NULL)`
   - Fields: `id`, `characterId`, `itemId`, `provider`, `providerAccountId`, `createdAt`, `claimedAt`, `claimedByUserId`
4. Added `canCreateOrphanedCharacter` permission to `Role` model

**Migration Applied**: ✅ Successfully applied to database

---

### Phase 2: PendingOwnership Module

**Files Created:**
- `apps/backend/src/pending-ownership/pending-ownership.module.ts`
- `apps/backend/src/pending-ownership/pending-ownership.service.ts`
- `apps/backend/src/pending-ownership/entities/pending-ownership.entity.ts`
- `apps/backend/src/pending-ownership/dto/pending-ownership.dto.ts`

**Key Features:**
- `createForCharacter()` - Create pending ownership for a character
- `createForItem()` - Create pending ownership for an item
- `findUnclaimedByAccount()` - Get all unclaimed items for external account
- `claimAllForAccount()` - **Atomic transaction** to claim all pending items and transfer ownership
- `findById()`, `findAll()`, `remove()` - Standard CRUD operations

**GraphQL Entity:**
- Registered `ExternalAccountProvider` enum for GraphQL
- Full PendingOwnership ObjectType with relations

---

### Phase 3: External Accounts Integration

**Files Modified:**
- `apps/backend/src/external-accounts/external-accounts.module.ts` - Import PendingOwnershipModule
- `apps/backend/src/external-accounts/external-accounts.service.ts` - Automatic claiming
- `apps/backend/src/auth/discord-oauth.controller.ts` - Pass claimed counts to frontend
- `apps/backend/src/auth/deviantart-oauth.controller.ts` - Pass claimed counts to frontend

**Changes:**
1. `linkExternalAccount()` now returns `LinkAccountResult`:
   ```typescript
   interface LinkAccountResult {
     externalAccount: ExternalAccount;
     claimedCharacterIds: string[];
     claimedItemIds: string[];
   }
   ```
2. Automatically calls `claimAllForAccount()` after linking
3. OAuth controllers redirect with URL params: `?success=true&claimedCharacters=X&claimedItems=Y`

---

### Phase 4: Characters Module

**Files Modified:**
- `apps/backend/src/characters/characters.module.ts` - Import PendingOwnershipModule
- `apps/backend/src/characters/characters.service.ts`
- `apps/backend/src/characters/characters.resolver.ts`
- `apps/backend/src/characters/dto/character.dto.ts`
- `apps/backend/src/characters/utils/character-resolver-mappers.ts`
- `apps/backend/src/characters/entities/character.entity.ts`

**CharactersService Changes:**
1. **create()** method now accepts:
   ```typescript
   {
     characterData: ...,
     tags?: string[],
     ownerId?: string | null,  // null for orphaned
     pendingOwner?: PendingOwnerInput
   }
   ```
2. **transfer()** method:
   - Now handles `currentOwnerId: string | null` (for orphaned characters)
   - **Fixed bug**: Now creates `CharacterOwnershipChange` records
3. **userHasOrphanedCharacterPermission()** - Permission check for `canCreateOrphanedCharacter`

**GraphQL Changes:**
1. `Character.ownerId` made nullable
2. `Character.owner` field resolver returns `null` for orphaned characters
3. `CreateCharacterInput.pendingOwner` field added
4. `createCharacter` mutation validates orphaned character permissions

**Type Safety:**
- Updated character mappers to handle `null` ownerId
- All type checks passing ✅

---

### Phase 5: Items Module

**Files Modified:**
- `apps/backend/src/items/items.module.ts` - Import PendingOwnershipModule
- `apps/backend/src/items/items.service.ts`
- `apps/backend/src/items/items.resolver.ts`
- `apps/backend/src/items/dto/item.dto.ts`

**ItemsService Changes:**
1. **grantItem()** method now accepts:
   ```typescript
   {
     itemTypeId: string,
     userId?: string | null,  // Optional for orphaned
     quantity: number,
     metadata?: any,
     pendingOwner?: PendingOwnerInput
   }
   ```
2. Skips user validation and community membership check for orphaned items
3. Creates pending ownership record when `pendingOwner` provided

**GraphQL Changes:**
1. `GrantItemInput.userId` made nullable
2. `GrantItemInput.pendingOwner` field added
3. `grantItem` mutation passes through `pendingOwner`

---

### Phase 6: App Module Integration

**File Modified:**
- `apps/backend/src/app.module.ts` - Registered PendingOwnershipModule

---

## 📋 TODO - Frontend Implementation

### 1. Character Creation Form

**File to Modify:**
- `apps/frontend/src/pages/CreateCharacterPageEnhanced.tsx`

**Implementation Steps:**
1. Query current user's role permissions to check `canCreateOrphanedCharacter`
2. Add conditional UI section (only visible with permission):
   ```tsx
   <RadioGroup>
     <Radio value="normal">Owned by me</Radio>
     <Radio value="orphaned">Orphaned (no owner)</Radio>
     <Radio value="pending">Pending ownership</Radio>
   </RadioGroup>
   ```
3. If "pending" selected, show:
   - Provider dropdown (Discord / DeviantArt)
   - Text input for provider account ID
   - Help text: "Enter Discord user ID or DeviantArt username"
4. Update GraphQL mutation variables:
   ```graphql
   mutation CreateCharacter($input: CreateCharacterInput!) {
     createCharacter(input: $input) {
       # ... fields
     }
   }
   ```
   Pass `pendingOwner: { provider, providerAccountId }` when applicable

**GraphQL Type Already Updated**: Backend schema includes `pendingOwner` field

---

### 2. Character Display Components

**Files to Modify:**
- Character detail page (likely `apps/frontend/src/pages/CharacterDetailPage.tsx` or similar)
- Character card component (if exists)

**Implementation Steps:**
1. Check if `character.ownerId === null`:
   - Show badge: `<Badge>Community Character</Badge>`
   - Style: Gray/neutral color
2. Check if `character.pendingOwnership` exists:
   - Show badge: `<Badge><DiscordIcon /> Pending Ownership</Badge>`
   - Display provider icon based on `character.pendingOwnership.provider`
   - Display account ID: `character.pendingOwnership.providerAccountId`
3. Disable edit/delete buttons for orphaned characters (unless user is admin)

**GraphQL Query Update Needed:**
```graphql
query GetCharacter($id: ID!) {
  character(id: $id) {
    # ... existing fields
    ownerId  # May be null
    pendingOwnership {
      id
      provider
      providerAccountId
      createdAt
    }
  }
}
```

---

### 3. Account Linking Callback Pages

**Files to Modify:**
- `apps/frontend/src/pages/DiscordCallbackPage.tsx`
- `apps/frontend/src/pages/DeviantArtCallbackPage.tsx`

**Implementation Steps:**
1. Parse URL search params:
   ```typescript
   const searchParams = new URLSearchParams(window.location.search);
   const claimedCharacters = searchParams.get('claimedCharacters');
   const claimedItems = searchParams.get('claimedItems');
   ```
2. If items were claimed, show notification/modal:
   ```tsx
   {(claimedCharacters || claimedItems) && (
     <Alert status="success">
       <AlertIcon />
       Success! You've claimed:
       {claimedCharacters && ` ${claimedCharacters} character(s)`}
       {claimedItems && ` ${claimedItems} item(s)`}
     </Alert>
   )}
   ```
3. Optionally link to user's characters/items pages

**Backend Already Implemented**: OAuth controllers pass `claimedCharacters` and `claimedItems` params

---

### 4. Item Grant UI (Optional - if UI exists)

**File to Locate:**
- Search for item grant/admin interface

**Implementation:**
- Mirror character creation form pattern
- Add same orphaned/pending options when granting items

---

## 🧪 Testing Checklist

### Backend Tests (To Be Written)
- [ ] PendingOwnership CRUD operations
- [ ] CHECK constraint validation (both IDs set = error, neither set = error)
- [ ] Automatic claiming flow
- [ ] Permission checks for `canCreateOrphanedCharacter`
- [ ] Character transfer from null owner
- [ ] Item grant with null owner

### Integration Tests (To Be Written)
- [ ] Full flow: Create pending character → Link Discord account → Verify ownership transferred
- [ ] Multiple pending items claimed simultaneously
- [ ] Orphaned character visibility restrictions
- [ ] Cascading deletes (delete character → pending ownership deleted)

### Manual Testing Checklist
- [ ] Create orphaned character as admin
- [ ] Create pending character for Discord account
- [ ] Link Discord account and verify automatic claiming
- [ ] Verify orphaned characters are view-only for regular users
- [ ] Verify permission checks work (non-admin cannot create orphaned)
- [ ] Test with DeviantArt account linking
- [ ] Test claiming multiple pending items at once
- [ ] Verify claimed items notification shows on callback page

---

## 🔑 Key Technical Decisions

### 1. Automatic vs Manual Claiming
**Decision**: Automatic claiming when account is linked
**Rationale**: Simpler UX, no additional user action required

### 2. Pending Ownership Data Model
**Decision**: Separate `PendingOwnership` table with proper FK constraints
**Rationale**:
- Clean separation of concerns
- Efficient queries by external account
- Proper database constraints (CHECK, CASCADE delete)
- Easier to audit and manage

### 3. Permission Model
**Decision**: New `canCreateOrphanedCharacter` community-level permission
**Rationale**: Granular control, admin-only by default, can be delegated to trusted community members

### 4. Expiration Strategy
**Decision**: No automatic expiration, pending items stay indefinitely
**Rationale**: Event use case (trick-or-treat) may have delayed claiming, manual cleanup by admins if needed

### 5. Orphaned Character Restrictions
**Decision**: View-only for non-admins
**Rationale**: Prevents unintended modifications, maintains data integrity

### 6. Ownership Change Tracking
**Decision**: Create `CharacterOwnershipChange` records on transfer
**Rationale**: Audit trail for all ownership changes (including claims from null owner)

---

## 📁 File Reference

### Backend Files Modified/Created (15 files)

**Database:**
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20251101033053_add_orphaned_characters_and_pending_ownership/migration.sql`

**PendingOwnership Module:**
- `apps/backend/src/pending-ownership/pending-ownership.module.ts`
- `apps/backend/src/pending-ownership/pending-ownership.service.ts`
- `apps/backend/src/pending-ownership/entities/pending-ownership.entity.ts`
- `apps/backend/src/pending-ownership/dto/pending-ownership.dto.ts`

**External Accounts:**
- `apps/backend/src/external-accounts/external-accounts.module.ts`
- `apps/backend/src/external-accounts/external-accounts.service.ts`
- `apps/backend/src/auth/discord-oauth.controller.ts`
- `apps/backend/src/auth/deviantart-oauth.controller.ts`

**Characters:**
- `apps/backend/src/characters/characters.module.ts`
- `apps/backend/src/characters/characters.service.ts`
- `apps/backend/src/characters/characters.resolver.ts`
- `apps/backend/src/characters/dto/character.dto.ts`
- `apps/backend/src/characters/utils/character-resolver-mappers.ts`
- `apps/backend/src/characters/entities/character.entity.ts`

**Items:**
- `apps/backend/src/items/items.module.ts`
- `apps/backend/src/items/items.service.ts`
- `apps/backend/src/items/items.resolver.ts`
- `apps/backend/src/items/dto/item.dto.ts`

**App:**
- `apps/backend/src/app.module.ts`

### Frontend Files To Modify (4-5 files)

**To Be Modified:**
- `apps/frontend/src/pages/CreateCharacterPageEnhanced.tsx`
- `apps/frontend/src/pages/DiscordCallbackPage.tsx`
- `apps/frontend/src/pages/DeviantArtCallbackPage.tsx`
- Character detail page (TBD - find exact file)
- Item grant page (TBD - if exists)

---

## 🚀 Commits Made

1. **feat(database): add orphaned characters and pending ownership (#125)**
   - Database schema changes, migration, type fixes

2. **feat(backend): add PendingOwnership module (#125)**
   - Core pending ownership service and entities

3. **feat(backend): integrate automatic pending item claiming (#125)**
   - External accounts integration with automatic claiming

4. **feat(characters): add orphaned and pending ownership support (#125)**
   - Full character support for orphaned/pending

5. **feat(items): add orphaned and pending ownership support (#125)**
   - Full item support for orphaned/pending

---

## 📝 Example Usage

### Backend: Create Orphaned Character
```graphql
mutation {
  createCharacter(input: {
    name: "Community Dragon"
    speciesId: "some-species-id"
    # No ownerId - orphaned character
  }) {
    id
    name
    ownerId  # Will be null
  }
}
```

### Backend: Create Pending Character
```graphql
mutation {
  createCharacter(input: {
    name: "Trick or Treat Prize"
    speciesId: "some-species-id"
    pendingOwner: {
      provider: DISCORD
      providerAccountId: "123456789"
    }
  }) {
    id
    name
    ownerId  # Will be null
    pendingOwnership {
      provider
      providerAccountId
    }
  }
}
```

### Backend: Grant Pending Item
```graphql
mutation {
  grantItem(input: {
    itemTypeId: "some-item-type-id"
    quantity: 1
    pendingOwner: {
      provider: DISCORD
      providerAccountId: "123456789"
    }
  }) {
    id
    ownerId  # Will be null
  }
}
```

---

## 🎯 Next Steps

1. **Frontend Implementation** (Estimated 2-4 hours)
   - Character creation form UI
   - Character display badges
   - Account linking callback enhancements

2. **Testing** (Estimated 2-3 hours)
   - Write unit tests for PendingOwnershipService
   - Integration tests for claiming flow
   - Manual E2E testing

3. **Documentation** (Estimated 30 mins)
   - Update API documentation
   - Admin guide for creating pending items

4. **Code Review & PR**
   - Create pull request from `feat/gh-125-orphaned-characters`
   - Address review feedback
   - Merge to main

---

## ⚠️ Important Notes

1. **Database Migration**: Already applied - existing characters/items all have owners (no nulls in production)
2. **Backward Compatibility**: Full backward compatibility maintained - all existing functionality works unchanged
3. **Type Safety**: All TypeScript checks passing ✅
4. **Permissions**: Default roles won't have `canCreateOrphanedCharacter` - must be manually granted
5. **GraphQL Schema**: Auto-generated, will include all new fields when backend restarts

---

**Document Created**: 2025-10-31
**Last Updated**: 2025-10-31
**Author**: Claude (AI Assistant)
**Status**: Backend Complete, Frontend Pending
