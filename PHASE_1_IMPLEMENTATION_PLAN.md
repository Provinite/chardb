# Phase 1: Core Entity Migration - Implementation Plan

## Overview
This document outlines the detailed implementation plan for migrating core entities (Community, Species, Traits) from the working clovercoin-app implementation to the NestJS/Prisma architecture in thclone.

## Implementation Strategy
Based on analysis of both codebases, this plan follows the established patterns in thclone while adapting the proven data models from clovercoin-app.

---

## Phase 1a: Database Schema Migration

### 1. Update Prisma Schema (`packages/database/prisma/schema.prisma`)

**Add to schema.prisma:**

```prisma
enum TraitValueType {
  STRING
  INTEGER  
  TIMESTAMP
  ENUM
}

model Community {
  id    String @id @default(uuid())
  name  String @unique @db.VarChar(100)
  
  // Relations
  species Species[]
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("communities")
}

model Species {
  id          String  @id @default(uuid())
  name        String  @db.VarChar(100)
  communityId String  @map("community_id")
  hasImage    Boolean @default(false) @map("has_image")
  
  // Relations
  community  Community       @relation(fields: [communityId], references: [id], onDelete: Cascade)
  characters Character[]     @relation("CharacterSpecies")
  variants   SpeciesVariant[]
  traits     Trait[]
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@unique([name, communityId])
  @@map("species")
}

model SpeciesVariant {
  id        String @id @default(uuid())
  name      String @db.VarChar(100)
  speciesId String @map("species_id")
  
  // Relations
  species            Species             @relation(fields: [speciesId], references: [id], onDelete: Cascade)
  characters         Character[]         @relation("CharacterVariant")
  traitListEntries   TraitListEntry[]
  enumValueSettings  EnumValueSetting[]
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@unique([name, speciesId])
  @@map("species_variants")
}

model Trait {
  id        String         @id @default(uuid())
  name      String         @db.VarChar(100)
  valueType TraitValueType @map("value_type")
  speciesId String         @map("species_id")
  
  // Relations
  species         Species           @relation(fields: [speciesId], references: [id], onDelete: Cascade)
  enumValues      EnumValue[]
  traitListEntries TraitListEntry[]
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@unique([name, speciesId])
  @@map("traits")
}

model EnumValue {
  id      String @id @default(uuid())
  name    String @db.VarChar(100)
  order   Int
  traitId String @map("trait_id")
  
  // Relations
  trait             Trait              @relation(fields: [traitId], references: [id], onDelete: Cascade)
  enumValueSettings EnumValueSetting[]
  
  @@unique([name, traitId])
  @@map("enum_values")
}

model TraitListEntry {
  id                String    @id @default(uuid())
  traitId           String    @map("trait_id")
  speciesVariantId  String    @map("species_variant_id")
  order             Int
  required          Boolean   @default(false)
  valueType         TraitValueType @map("value_type")
  
  // Default values
  defaultValueString    String?   @map("default_value_string")
  defaultValueInt       Int?      @map("default_value_int")
  defaultValueTimestamp DateTime? @map("default_value_timestamp")
  
  // Relations
  trait          Trait          @relation(fields: [traitId], references: [id], onDelete: Cascade)
  speciesVariant SpeciesVariant @relation(fields: [speciesVariantId], references: [id], onDelete: Cascade)
  
  @@unique([traitId, speciesVariantId])
  @@map("trait_list_entries")
}

model EnumValueSetting {
  id               String @id @default(uuid())
  speciesVariantId String @map("species_variant_id")
  enumValueId      String @map("enum_value_id")
  
  // Relations
  speciesVariant SpeciesVariant @relation(fields: [speciesVariantId], references: [id], onDelete: Cascade)
  enumValue      EnumValue      @relation(fields: [enumValueId], references: [id], onDelete: Cascade)
  
  @@unique([speciesVariantId, enumValueId])
  @@map("enum_value_settings")
}
```

### 2. Generate Migration with Prisma

```bash
cd packages/database
yarn dlx prisma migrate dev --name "add-core-entities"
```

This will auto-generate the migration SQL and create the migration file.

---

## Phase 1b: Character Model Updates

### 1. Update Character Model in Prisma Schema

**Modify existing Character model:**

```prisma
model Character {
  // ... existing fields ...
  
  // Remove old species string field (drop data)
  // species      String?    @db.VarChar(50)  // DELETE THIS LINE
  
  // New species integration fields
  speciesId    String? @map("species_id")
  variantId    String? @map("variant_id") 
  traitValues  Json    @default("[]") @map("trait_values")
  
  // New relations
  species Species?       @relation("CharacterSpecies", fields: [speciesId], references: [id], onDelete: SetNull)
  variant SpeciesVariant? @relation("CharacterVariant", fields: [variantId], references: [id], onDelete: SetNull)
  
  // ... existing relations ...
  
  // Add indexes for trait values
  @@index([speciesId])
  @@index([variantId])
}
```

### 2. Generate Character Updates Migration

```bash
yarn dlx prisma migrate dev --name "update-character-species-integration"
```

This will:
- Drop the old `species` column and its data
- Add new `speciesId`, `variantId`, `traitValues` fields
- Add foreign key constraints
- Create GIN index on `traitValues` JSONB field
- Add performance indexes

---

## Phase 1c: NestJS Implementation

### 1. Create GraphQL Entities (`apps/backend/src/`)

**New directories structure:**
```
apps/backend/src/
├── communities/
│   ├── entities/community.entity.ts
│   ├── dto/community.dto.ts
│   ├── communities.service.ts
│   ├── communities.resolver.ts
│   └── communities.module.ts
├── species/
│   ├── entities/species.entity.ts
│   ├── dto/species.dto.ts
│   ├── species.service.ts
│   ├── species.resolver.ts
│   └── species.module.ts
├── species-variants/
│   ├── entities/species-variant.entity.ts
│   ├── dto/species-variant.dto.ts
│   ├── species-variants.service.ts
│   ├── species-variants.resolver.ts
│   └── species-variants.module.ts
├── traits/
│   ├── entities/trait.entity.ts
│   ├── entities/enum-value.entity.ts
│   ├── dto/trait.dto.ts
│   ├── traits.service.ts
│   ├── traits.resolver.ts
│   └── traits.module.ts
└── shared/
    ├── enums/trait-value-type.enum.ts
    └── types/trait-value.types.ts
```

### 2. Entity Implementations

**`shared/enums/trait-value-type.enum.ts`:**
```typescript
import { registerEnumType } from '@nestjs/graphql';

export enum TraitValueType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  TIMESTAMP = 'TIMESTAMP',
  ENUM = 'ENUM',
}

registerEnumType(TraitValueType, {
  name: 'TraitValueType',
  description: 'Types of values that traits can hold',
});
```

**`communities/entities/community.entity.ts`:**
```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Species } from '../../species/entities/species.entity';

@ObjectType()
export class Community {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => [Species], { nullable: true })
  species?: Species[];
}
```

**`species/entities/species.entity.ts`:**
```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Community } from '../../communities/entities/community.entity';
import { SpeciesVariant } from '../../species-variants/entities/species-variant.entity';
import { Trait } from '../../traits/entities/trait.entity';

@ObjectType()
export class Species {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => ID)
  communityId: string;

  @Field()
  hasImage: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => Community)
  community: Community;

  @Field(() => [SpeciesVariant], { nullable: true })
  variants?: SpeciesVariant[];

  @Field(() => [Trait], { nullable: true })
  traits?: Trait[];
}
```

**`traits/entities/trait.entity.ts`:**
```typescript
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { TraitValueType } from '../../shared/enums/trait-value-type.enum';
import { Species } from '../../species/entities/species.entity';
import { EnumValue } from './enum-value.entity';

@ObjectType()
export class Trait {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => TraitValueType)
  valueType: TraitValueType;

  @Field(() => ID)
  speciesId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => Species)
  species: Species;

  @Field(() => [EnumValue], { nullable: true })
  enumValues?: EnumValue[];
}
```

**`traits/entities/enum-value.entity.ts`:**
```typescript
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Trait } from './trait.entity';

@ObjectType()
export class EnumValue {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Int)
  order: number;

  @Field(() => ID)
  traitId: string;

  // Relations
  @Field(() => Trait)
  trait: Trait;
}
```

**`shared/types/trait-value.types.ts`:**
```typescript
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class TraitValue {
  @Field(() => ID)
  traitId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  value: string | number | Date | null;
}
```

### 3. Update Character Entity

**`characters/entities/character.entity.ts`** (add to existing):
```typescript
// Add imports
import { Species } from '../../species/entities/species.entity';
import { SpeciesVariant } from '../../species-variants/entities/species-variant.entity';
import { TraitValue } from '../../shared/types/trait-value.types';

// Add to Character class
@Field(() => ID, { nullable: true })
speciesId?: string;

@Field(() => ID, { nullable: true })  
variantId?: string;

@Field(() => [TraitValue])
traitValues: TraitValue[];

// Relations
@Field(() => Species, { nullable: true })
species?: Species;

@Field(() => SpeciesVariant, { nullable: true })
variant?: SpeciesVariant;
```

### 4. Service Implementations

**Pattern: Each service follows `apps/backend/src/characters/characters.service.ts`**
- Use `DatabaseService` for Prisma queries
- Implement standard CRUD methods
- Add business logic validation
- Handle relations properly

### 5. DTO Implementations

**Pattern: Follow `apps/backend/src/characters/dto/character.dto.ts`**
- `@InputType()` for mutations
- Class-validator decorators
- Proper field validation (string length limits, etc.)

### 6. Resolver Implementations  

**Pattern: Follow `apps/backend/src/characters/characters.resolver.ts`**
- Standard GraphQL CRUD operations
- Proper authorization decorators
- Field resolvers for relations
- Pagination support

---

## Phase 1d: Validation & Testing

### 1. Trait Value Validation Service

**`shared/services/trait-validation.service.ts`:**
```typescript
@Injectable()
export class TraitValidationService {
  validateTraitValue(trait: Trait, value: any): boolean {
    switch (trait.valueType) {
      case TraitValueType.STRING:
        return typeof value === 'string' && value.length <= 1000;
      case TraitValueType.INTEGER:
        return Number.isInteger(value) && value >= -999999 && value <= 999999;
      case TraitValueType.TIMESTAMP:
        return value instanceof Date || !isNaN(Date.parse(value));
      case TraitValueType.ENUM:
        return trait.enumValues.some(ev => ev.id === value);
      default:
        return false;
    }
  }
}
```

### 2. Sample Data Generation

**Create seeding script for testing communities, species, and traits**

### 3. Unit Tests

**Each service gets corresponding `.spec.ts` files**
- Database mocking patterns
- CRUD operation testing
- Validation testing

### 4. Integration Tests

**End-to-end GraphQL query testing**
- Character creation with traits
- Species/variant relationship queries
- Complex filtering operations

---

## Implementation Steps

### Phase 1a Commands:
```bash
# Update Prisma schema with new entities
# Then generate migration
cd packages/database
yarn dlx prisma migrate dev --name "add-core-entities"
yarn dlx prisma generate
```

### Phase 1b Commands:
```bash
# Update Character model in schema
# Then generate migration  
yarn dlx prisma migrate dev --name "update-character-species-integration"
yarn dlx prisma generate
```

### Phase 1c Commands:
```bash
# Create all NestJS entities, services, resolvers
# Update app.module.ts imports
# Test with GraphQL playground
```

---

## Performance Considerations

### Database Indexes
- Prisma automatically creates indexes for foreign keys
- GIN index on `Character.traitValues` for JSONB queries
- Composite unique indexes handled by Prisma

### Query Optimization
- Efficient relation loading with Prisma `include`
- Pagination for large lists
- Proper N+1 query prevention

---

## Success Metrics

1. **Database**: All migrations complete without errors
2. **API**: All CRUD operations work via GraphQL playground  
3. **Performance**: Trait queries complete in <200ms for 12 traits
4. **Validation**: All trait value constraints enforced
5. **Testing**: 90%+ code coverage on new services

---

## Next Steps (Phase 2+)

This implementation provides the foundation for:
- **Phase 2**: Role-based permissions and community membership
- **Phase 3**: Dynamic trait system replacing static Character fields  
- **Phase 4**: Inventory and collections system
- **Frontend**: Character creation/editing UI integration