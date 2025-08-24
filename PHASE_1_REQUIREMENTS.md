# Phase 1: Core Entity Migration - Requirements Documentation

## Overview
Backend-only implementation of community-based character organization with flexible trait systems. This phase establishes the database foundation and GraphQL API for communities, species, and dynamic traits.

## Migration Strategy

### Species Data Handling
- **Drop existing `Character.species` string field completely** - no data preservation needed
- System is in small dev test group, existing test data can be discarded
- Clean slate approach for new trait system

### Database Changes
- **Phase 1a**: Create new core entities (Community, Species, Trait, SpeciesVariant, EnumValue, TraitListEntry, EnumValueSetting) 
- **Phase 1b**: Add optional foreign keys to Character table (`speciesId`, `variantId`, `traitValues`)
- **Phase 1c**: Create sample data for testing
- **Phase 1d**: API implementation and integration testing

## Business Rules & Validation

### Trait Value Constraints
- **String traits**: Maximum 1000 characters
- **Integer traits**: Reasonable numeric bounds (e.g., -999999 to 999999)
- **Enum traits**: Must exactly match defined EnumValue entries for the trait
- **Timestamp traits**: Must be valid ISO date format

### Scale Expectations
- **Traits per species**: ~12 typical, up to 100 maximum extreme case
- **Enum complexity**: Flat values only (name + order), no hierarchical structures
- **Performance**: Optimized for dozen-trait queries, scalable to 100-trait edge cases

### Data Model Rules
- Communities are top-level organizational units
- Species belong to communities and define available traits
- Species variants define specific trait configurations
- Characters can optionally link to species/variants
- Trait values stored as JSONB for flexibility

## Implementation Scope

### Backend Only (Phase 1)
- Database schema migration
- NestJS entities and services
- GraphQL resolvers and DTOs
- Validation logic
- Unit and integration tests

### Validation via GraphQL/Database
- Test all CRUD operations through GraphQL playground
- Verify trait value validation rules
- Confirm relationship integrity
- Performance testing with expected data volumes

### UI Work Deferred
- No frontend components in Phase 1
- Character creation/editing UI updates in later phases
- Focus on solid API foundation first

## Reference Implementation Available
- Working implementation exists in `~/dev/clovercoin/clovercoin-app` (non-NestJS)
- Can reference for patterns and edge cases
- Adapt patterns to NestJS/GraphQL architecture

## Success Criteria
- [ ] All new entities can be created/read/updated/deleted via GraphQL API
- [ ] Characters can optionally link to species and variants
- [ ] Trait values validate according to defined constraints
- [ ] Complex queries perform adequately (species + traits + characters)
- [ ] Migration completes without breaking existing character data
- [ ] Comprehensive test coverage for new functionality

## Technical Constraints
- Maintain existing Character functionality during migration
- Follow established NestJS/GraphQL patterns in codebase  
- Use Prisma migration system
- Preserve existing authorization patterns
- JSON trait values for flexibility while maintaining query performance