# Implementation Plan for Issue #2: Character Main Image/Icon Functionality

## Backend Implementation

### 1. Database Schema Changes
- Add `main_image_id` foreign key field to Character model (references Image table)
- Create database migration for the new field
- Add cascade deletion handling (clear main_image_id when referenced image is deleted)

### 2. GraphQL Schema Updates
- Update Character type to include `mainImage` field
- Add resolver for fetching main image data
- Create `setCharacterMainImage` mutation with proper authorization
- Update existing character queries to optionally include main image

### 3. Authorization & Business Logic
- Implement ownership validation (only character owners can set main image)
- Handle edge cases (image deletion, invalid image references)
- Add proper error handling and validation

## Frontend Implementation

### 4. Character Image Gallery Enhancement
- Add "Set as main image" button/option to existing image gallery
- Show visual indicator for current main image
- Implement mutation call to backend
- Add loading states and error handling

### 5. Character Profile Page Updates
- Update CharacterPage component to prominently display main image
- Modify layout to feature main image in header/hero section
- Implement fallback placeholder for characters without main images

### 6. Character Listings & Cards
- Update character card components to display main image icons
- Ensure consistent sizing and aspect ratio across listings
- Handle NSFW content appropriately in public listings
- Implement responsive design for different screen sizes

### 7. Supporting Features
- Create reusable CharacterIcon/Avatar component
- Design and implement placeholder system for characters without main images
- Add proper loading states throughout the application

## Execution Steps
1. ✅ Write this plan to `CURRENT_PLAN.md`
2. Implement backend database and GraphQL changes
3. Implement frontend components and UI updates
4. Test the complete functionality
5. Run type checking and linting
6. Commit changes with appropriate commit messages

## Technical Approach
- Follow existing codebase patterns for GraphQL mutations and React components
- Maintain consistency with current image handling and authorization patterns
- Ensure proper TypeScript typing throughout
- Test edge cases and error scenarios

This implementation will provide users with visual character identification in listings and prominent main image display on character profiles, while maintaining proper authorization and handling edge cases gracefully.