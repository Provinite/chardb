# CloveCoin App Integration Specification

## Overview

This document outlines the existing entity model from the `clovercoin-app` codebase and provides a specification for integrating these concepts into the current character database system.

## Existing Entity Architecture

### Core Entities

#### 1. Community

**Purpose**: Top-level organizational unit that contains species, roles, and manages permissions.

**Fields**:

- `id`: UUID primary key
- `name`: Unique string identifier
- `roles`: One-to-many relationship with Role entities

**Business Logic**:

- Communities are the highest level of organization
- Each community can have multiple species and roles
- Community ownership determines administrative control

#### 2. Identity

**Purpose**: User/account entity representing individuals in the system.

**Fields**:

- `id`: UUID primary key
- `displayName`: Public display name
- `email`: Unique email address
- `communityMemberships`: One-to-many relationship with CommunityMember
- Global permissions: `canCreateCommunity`, `canListIdentities`, `canListInviteCodes`, `canCreateInviteCode`, `canGrantGlobalPermissions`

**Business Logic**:

- Identities can be members of multiple communities with different roles
- Global permissions control system-wide capabilities
- Identity serves as the account/user concept

#### 3. Role

**Purpose**: Defines permissions and capabilities within a specific community.

**Fields**:

- `id`: UUID primary key
- `name`: Role name (unique within community)
- `communityId`: Foreign key to Community
- `communityMembers`: One-to-many relationship with CommunityMember
- Permission flags: `canCreateSpecies`, `canCreateCritter`, `canEditCritter`, `canEditSpecies`, `canCreateInviteCode`, `canListInviteCodes`, `canCreateRole`, `canEditRole`

**Business Logic**:

- Roles are community-specific
- Each role defines granular permissions for community operations
- Users can have different roles in different communities

#### 4. CommunityMember

**Purpose**: Junction entity linking Identities to Roles within Communities.

**Fields**:

- `id`: UUID primary key
- `roleId`: Foreign key to Role
- `identityId`: Foreign key to Identity
- Unique constraint on (roleId, identityId)

**Business Logic**:

- Represents membership with a specific role in a community
- One identity can have multiple memberships (different communities/roles)
- Enforces unique role-identity combinations

#### 5. Species

**Purpose**: Defines a class of characters with common traits and variants.

**Fields**:

- `id`: UUID primary key
- `name`: Unique species name
- `communityId`: Foreign key to Community (species ownership)
- `critters`: One-to-many relationship with Critter entities
- `variants`: One-to-many relationship with SpeciesVariant entities
- `hasImage`: Boolean flag for image availability

**Business Logic**:

- Species belong to communities
- Each species can have multiple variants and critters
- Species define the template for trait systems

#### 6. SpeciesVariant

**Purpose**: Specific configuration of traits and settings for a species.

**Fields**:

- `id`: UUID primary key
- `name`: Variant name
- `speciesId`: Foreign key to Species
- `traitListEntries`: One-to-many relationship with TraitListEntry
- `enumValueSettings`: One-to-many relationship with EnumValueSetting
- `critters`: One-to-many relationship with Critter

**Business Logic**:

- Variants define specific trait configurations for a species
- Each variant specifies which traits are available and their settings
- Critters are created using a specific variant

#### 7. Trait

**Purpose**: Defines individual characteristics that can be assigned to critters.

**Fields**:

- `id`: UUID primary key
- `name`: Trait name
- `valueType`: Enum (String, Timestamp, Integer, Enum)
- `speciesId`: Foreign key to Species
- `enumValues`: One-to-many relationship with EnumValue (for enum traits)

**Business Logic**:

- Traits are species-specific
- Different value types support various data types
- Enum traits have predefined value options

#### 8. TraitListEntry

**Purpose**: Configures how a trait appears in a specific variant.

**Fields**:

- `id`: UUID primary key
- `traitId`: Foreign key to Trait
- `speciesVariantId`: Foreign key to SpeciesVariant
- `order`: Display order in the variant
- `required`: Boolean flag for requirement
- `valueType`: Copy of trait's value type
- Default values: `defaultValueString`, `defaultValueInt`, `defaultValueTimestamp`

**Business Logic**:

- Links traits to variants with specific configuration
- Defines ordering, requirements, and default values
- Allows variants to customize trait presentation

#### 9. EnumValue

**Purpose**: Defines possible values for enum-type traits.

**Fields**:

- `id`: UUID primary key
- `traitId`: Foreign key to Trait
- `name`: Value name
- `order`: Display order

**Business Logic**:

- Only applies to enum-type traits
- Provides predefined options for trait values
- Ordered for consistent presentation

#### 10. EnumValueSetting

**Purpose**: Configures which enum values are available for a specific variant.

**Fields**:

- `id`: UUID primary key
- `speciesVariantId`: Foreign key to SpeciesVariant
- `enumValueId`: Foreign key to EnumValue
- Unique constraint on (speciesVariantId, enumValueId)

**Business Logic**:

- Allows variants to restrict available enum values
- Provides variant-specific customization of enum traits

#### 11. Critter

**Purpose**: Individual character/creature instances.

**Fields**:

- `id`: UUID primary key
- `name`: Critter name
- `speciesId`: Foreign key to Species
- `ownerId`: Foreign key to Identity (ownership)
- `variantId`: Foreign key to SpeciesVariant
- `traitValues`: JSONB array of trait values

**Business Logic**:

- Critters are owned by identities
- Must conform to their species and variant
- Trait values are stored as flexible JSONB structure
- Represents the actual character instances

## Missing Entities for Full Integration

Based on your requirements, we need to add:

### 1. Inventory

**Purpose**: Container for items owned by an identity or critter.

### 2. Item

**Purpose**: Individual objects that can be owned, traded, or used.

### 3. ItemType

**Purpose**: Categories/templates for different kinds of items.

## Integration Strategy

### Phase 1: Core Entity Migration

1. Map existing entities to Prisma schema patterns
2. Adapt TypeORM decorators to Prisma model definitions
3. Preserve existing relationships and constraints

### Phase 2: Permission System Integration

1. Integrate role-based permissions into current auth system
2. Adapt community-specific authorization patterns
3. Merge with existing user/character ownership models

### Phase 3: Trait System Enhancement

1. Replace simple character fields with flexible trait system
2. Integrate species variants with character creation
3. Adapt media/image system to work with species

### Phase 4: Inventory System Addition

1. Design inventory and item entities
2. Integrate with ownership and trading systems
3. Connect with character and community systems

## Key Design Patterns

1. **Community-Centric**: All content is organized within communities
2. **Role-Based Permissions**: Granular permissions through community roles
3. **Flexible Trait System**: Configurable traits with multiple value types
4. **Variant-Based Customization**: Species variants control available traits
5. **JSONB Storage**: Flexible trait value storage for performance
6. **Identity Ownership**: Clear ownership model for all entities

## Recommendations

1. **Start with Community/Species entities** as they form the foundation
2. **Preserve existing User/Character patterns** by mapping to Identity/Critter
3. **Use Prisma's relationship syntax** to replace TypeORM decorators
4. **Maintain permission granularity** from the role system
5. **Plan for inventory integration** in the schema design
