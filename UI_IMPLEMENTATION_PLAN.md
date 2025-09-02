# UI Implementation Plan: Core Entity Management

## Overview

This document outlines the user interface implementation needed to support the new backend entities introduced in PR #47. The plan covers invitation systems, species/trait management, and administrative interfaces with proper permission-based access controls.

## Core Concepts

- **Communities**: Users belong to communities with role-based permissions
- **Species**: Community-specific character species definitions  
- **Species Variants**: Rarities/breeds within a species (e.g., Common Pillowing, Rare Pillowing)
- **Traits**: Configurable properties for species (e.g., tail type, fur color)
- **Trait Values**: Character-specific values for traits
- **Trait Value Types**: STRING, INTEGER, TIMESTAMP, ENUM
- **Rarity System**: Rarer species variants have access to more trait options

---

## 1. Invitation System

### 1.1 Site-Level Invite Codes (Admin Only)

**Access**: Users with site-level `CREATE_INVITE_CODE` permission

**New Route**: `/admin/site-invite-codes`

**Functionality**:
- Create reusable site invite codes with usage limits
- View active site invite codes with usage statistics
- Edit usage limits and expiration dates
- Deactivate invite codes
- Generate shareable invite links

**UI Components**:
- `SiteInviteCodeList` - Table of active codes with usage stats
- `CreateSiteInviteCodeModal` - Form to create new codes
- `SiteInviteCodeCard` - Individual code management card

### 1.2 Community Invite Codes

**Access**: Community members with `CREATE_INVITE_CODE` role permission + Site admins

**New Route**: `/communities/{communityId}/invite-codes`

**Functionality**:
- Create community-specific invite codes
- Configure target role for new members
- Set usage limits and expiration
- View invite code analytics
- Support both "join community" (existing users) and "signup + join" (new users) flows

**UI Components**:
- `CommunityInviteCodeManager` - Main management interface
- `CreateCommunityInviteModal` - Creation form with role selection
- `InviteCodeStatsCard` - Usage analytics display

### 1.3 Public Signup with Invite Codes

**Access**: Public (unauthenticated users)

**Modified Route**: `/signup` 

**Functionality**:
- **Required**: Invite code input (no signup without valid code)
- Validate invite codes in real-time
- Show community information for community invite codes
- Auto-populate community/role assignment based on invite code
- Support both site-level and community invite codes

**UI Components**:
- `InviteCodeInput` - Code validation with real-time feedback  
- `CommunityPreview` - Shows community details for community codes
- `SignupForm` - Enhanced with invite code integration

### 1.4 Community Invite Acceptance

**Access**: Authenticated users

**New Route**: `/invites/accept/{inviteCode}`

**Functionality**:
- Accept community invites for existing users
- Show community preview and role information
- Join community and receive assigned role
- Redirect to community dashboard after acceptance

**UI Components**:
- `CommunityInvitePreview` - Community info and role details
- `AcceptInviteButton` - Confirmation action
- `InviteAcceptedSuccess` - Confirmation screen

---

## 2. Species Management System

### 2.1 Species CRUD Operations

**Access**: Community role-based permission for species management

**New Route**: `/communities/{communityId}/species`

**Functionality**:
- Create new species for the community
- Edit species name and description
- View all community species
- Delete species (with safeguards for species with existing characters)
- Bulk operations for species management

**UI Components**:
- `SpeciesManager` - Main species management interface
- `CreateSpeciesModal` - Species creation form
- `SpeciesCard` - Individual species display with actions
- `SpeciesList` - Grid/list view of all community species
- `DeleteSpeciesConfirmation` - Warning modal for deletion

### 2.2 Species Variant Management

**Access**: Same as species management permissions

**New Route**: `/communities/{communityId}/species/{speciesId}/variants`

**Functionality**:
- Add variants to existing species (Common, Rare, Legendary, etc.)
- Configure variant names and rarity levels  
- Set variant descriptions and requirements
- Manage variant ordering/hierarchy
- Delete variants (with character existence checks)

**UI Components**:
- `VariantManager` - Variant list with drag-drop ordering
- `CreateVariantModal` - Variant creation form
- `VariantCard` - Individual variant management
- `VariantHierarchy` - Visual representation of rarity levels

### 2.3 Species Selection Interface

**Access**: All community members (for character creation)

**Integration**: Character creation flow

**Functionality**:
- Browse community species in organized categories
- Filter species by availability/permissions  
- Select species variant based on user permissions/requirements
- Show variant requirements and restrictions
- Preview trait availability per variant

**UI Components**:
- `SpeciesBrowser` - Categorized species display
- `SpeciesCard` - Species preview with variant options
- `VariantSelector` - Variant selection with requirement info
- `TraitPreview` - Preview available traits for selected variant

---

## 3. Trait System Management

### 3.1 Trait Definition CRUD

**Access**: Community species management permissions

**New Route**: `/communities/{communityId}/species/{speciesId}/traits`

**Functionality**:
- Create traits for species (name, description, value type)
- Configure trait value types: STRING, INTEGER, TIMESTAMP, ENUM
- Edit trait properties and validation rules
- Set trait ordering and categorization
- Delete unused traits

**UI Components**:
- `TraitManager` - Main trait management interface
- `CreateTraitModal` - Trait creation with type selection
- `TraitCard` - Individual trait configuration
- `TraitTypeSelector` - Value type selection with validation options
- `TraitValidationConfig` - Type-specific validation settings

### 3.2 Enum Value Management

**Access**: Same as trait management permissions  

**New Route**: `/communities/{communityId}/species/{speciesId}/traits/{traitId}/enum-values`

**Functionality** (for ENUM type traits):
- Add enum values with names and descriptions
- Set enum value ordering
- Configure value availability (which variants can use which values)
- Edit enum value properties
- Delete unused enum values

**UI Components**:
- `EnumValueManager` - Enum value list with ordering
- `CreateEnumValueModal` - Value creation form  
- `EnumValueCard` - Individual value configuration
- `VariantAvailabilityMatrix` - Grid showing which variants can use which values

### 3.3 Species Variant Trait Configuration

**Access**: Same as trait management permissions

**New Route**: `/communities/{communityId}/species/{speciesId}/variants/{variantId}/traits`

**Functionality**:
- Configure which traits are available for each species variant
- Set trait requirements (required vs optional)
- Configure default values per variant
- Set trait ordering within variant
- Manage trait restrictions based on rarity

**UI Components**:
- `VariantTraitConfig` - Trait availability matrix
- `TraitAvailabilityToggle` - Enable/disable traits for variant
- `DefaultValueConfig` - Set default values per trait type
- `RequirementToggle` - Mark traits as required/optional
- `RarityTraitMatrix` - Visual representation of trait availability by rarity

---

## 4. Character Trait Management

### 4.1 Character Creation with Traits

**Access**: Community members (character creation)

**Integration**: Existing character creation flow

**Functionality**:
- Select species and variant first
- Dynamic trait form based on selected variant
- Real-time validation of trait values by type
- Required trait enforcement
- Default value pre-population
- Trait value type-specific inputs

**UI Components**:
- `TraitValueForm` - Dynamic form based on species variant
- `StringTraitInput` - Text input with validation
- `IntegerTraitInput` - Number input with min/max validation  
- `TimestampTraitInput` - Date/time picker
- `EnumTraitSelect` - Dropdown for enum values
- `RequiredTraitIndicator` - Visual indication of required traits

### 4.2 Character Trait Value Editing

**Access**: Character owner + community permission holders

**New Route**: `/characters/{characterId}/traits`

**Functionality**:
- Edit existing trait values
- Add values for optional traits not previously set
- Validate changes based on species variant requirements
- Show trait change history/audit trail
- Bulk trait editing interface

**UI Components**:
- `CharacterTraitEditor` - Main trait editing interface
- `TraitValueEditCard` - Individual trait value editor
- `TraitHistoryPanel` - Show previous values and changes
- `BulkTraitEditor` - Edit multiple traits at once
- `TraitValidationFeedback` - Real-time validation messages

---

## 5. Administrative Interfaces

### 5.1 Community Management Dashboard

**Access**: Community admins/managers

**New Route**: `/communities/{communityId}/admin`

**Functionality**:
- Community overview and statistics
- Member management and role assignment
- Invite code management (quick access)
- Species/trait management shortcuts
- Community settings and configuration
- Activity logs and audit trails

**UI Components**:
- `CommunityDashboard` - Main admin dashboard
- `CommunityStats` - Member count, species count, etc.
- `QuickActions` - Common admin tasks
- `MemberTable` - Member list with role management
- `ActivityFeed` - Recent community activity
- `CommunitySettingsPanel` - Basic community configuration

### 5.2 Site-Level Admin Dashboard

**Access**: Users with site-level admin permissions

**New Route**: `/admin`

**Functionality**:
- Site-wide statistics and analytics
- Global invite code management
- User management across communities
- System configuration and settings  
- Community management and oversight
- Audit logs and security monitoring

**UI Components**:
- `SiteAdminDashboard` - Main admin interface
- `SiteMetrics` - User count, community count, activity metrics
- `GlobalUserManager` - Site-wide user administration
- `CommunityOversight` - Monitor all communities
- `SystemConfig` - Site-level settings
- `AuditLogViewer` - Security and activity monitoring

### 5.3 Permission Management Interface

**Access**: Site admins + Community admins (for their communities)

**Integration**: User management interfaces

**Functionality**:
- View and edit user permissions at site level
- Manage community roles and permissions
- Role template creation and management  
- Permission inheritance visualization
- Bulk permission updates

**UI Components**:
- `PermissionMatrix` - Grid view of user permissions
- `RoleEditor` - Create/edit community roles
- `PermissionSelector` - Multi-select permission assignment
- `RoleTemplate` - Predefined role configurations
- `PermissionInheritanceTree` - Visual permission hierarchy

---

## 6. Enhanced User Experience Features

### 6.1 Smart Defaults and Suggestions

- Auto-populate common trait combinations
- Suggest species variants based on user preferences
- Smart ordering of traits by importance/frequency
- Template characters for quick creation

### 6.2 Validation and Error Handling

- Real-time validation for all trait inputs
- Clear error messages with correction suggestions
- Bulk validation for multi-trait operations
- Prevention of orphaned data (species with no variants, etc.)

### 6.3 Responsive Design Considerations

- Mobile-friendly species/trait browsing
- Touch-optimized trait value inputs
- Collapsible sections for complex forms
- Progressive disclosure of advanced options

### 6.4 Performance Optimizations

- Lazy loading for large species/trait lists
- Debounced search and filtering
- Cached enum values and trait configurations
- Optimistic updates for better UX

---

## 7. Implementation Priority

### Phase 1: Foundation
1. Site-level invite code management
2. Basic signup with invite code requirement
3. Community invite code creation

### Phase 2: Core Species Management  
1. Species CRUD operations
2. Species variant management
3. Basic trait definition

### Phase 3: Trait System
1. Complete trait type support (STRING, INTEGER, TIMESTAMP, ENUM)
2. Enum value management
3. Species variant trait configuration

### Phase 4: Character Integration
1. Character creation with traits
2. Character trait value editing  
3. Trait validation and requirements

### Phase 5: Administrative & Polish
1. Administrative dashboards
2. Permission management interfaces
3. Enhanced UX features and optimizations

---

## Technical Considerations

### API Integration
- Use existing GraphQL endpoints from PR #47
- Implement proper error handling for permission checks
- Add loading states for all async operations

### State Management
- Consider using React Query/SWR for caching
- Implement optimistic updates where appropriate  
- Handle complex form state for multi-step processes

### Routing Strategy
- Nested routes for community-specific management
- Protected routes based on permissions
- Deep linking support for administrative interfaces

### Testing Strategy
- Unit tests for trait validation logic
- Integration tests for multi-step flows (invite acceptance, character creation)
- E2E tests for complete user journeys
- Permission-based access testing

This plan provides comprehensive coverage of all backend functionality while maintaining a logical, permission-based user experience. Each interface is designed to support the specific workflows and requirements identified in the backend implementation.