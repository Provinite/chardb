# Polymorphic Media Content Design

## Overview

The backend implements a polymorphic media system that can handle both images and text content through a unified interface. This design allows the application to treat different media types consistently while maintaining type safety and performance.

## Architecture

### Core Concept: Nullable Foreign Keys

Instead of using traditional polymorphic associations or discriminator columns, the system uses **nullable foreign keys** to determine the content type:

- `Media.imageId` - Points to an `Image` record (null for text media)
- `Media.textContentId` - Points to a `TextContent` record (null for image media)

Only one of these fields is populated per media record, creating an implicit union type.

## Database Schema

### Media Table (Core Entity)

```typescript
// apps/backend/src/media/entities/media.entity.ts:40-86
@ObjectType()
export class Media {
  id: string              // Primary key
  title: string           // User-provided title
  description?: string    // Optional description
  ownerId: string         // FK to User
  characterId?: string    // Optional FK to Character
  galleryId?: string      // Optional FK to Gallery
  visibility: Visibility  // PUBLIC, UNLISTED, PRIVATE
  
  // Polymorphic content references (nullable FKs)
  imageId?: string        // FK to Image (null for text)
  textContentId?: string  // FK to TextContent (null for images)
  
  createdAt: Date
  updatedAt: Date
}
```

### Content-Specific Tables

#### Image Content
```typescript
// apps/backend/src/images/entities/image.entity.ts:6-87
export class Image {
  id: string
  filename: string
  originalFilename: string
  url: string
  thumbnailUrl?: string
  altText?: string
  uploaderId: string
  
  // Artist attribution
  artistId?: string
  artistName?: string
  artistUrl?: string
  source?: string
  
  // File metadata
  width: number
  height: number
  fileSize: number
  mimeType: string
  isNsfw: boolean
  sensitiveContentDescription?: string
  
  createdAt: Date
  updatedAt: Date
}
```

#### Text Content
```typescript
// apps/backend/src/media/entities/media.entity.ts:18-35
export class TextContent {
  id: string
  content: string           // The actual text
  wordCount: number         // Auto-calculated
  formatting: TextFormatting // PLAINTEXT or MARKDOWN
}
```

## Service Layer Implementation

### MediaService Architecture

The `MediaService` (`apps/backend/src/media/media.service.ts`) handles all polymorphic operations:

#### Key Features:

1. **Unified Queries**: Single service handles both image and text media
2. **Direct JOINs**: Uses Prisma includes to fetch content in single queries
3. **Type-Safe Filtering**: `MediaType` enum for filtering by content type
4. **Visibility Controls**: Proper handling of private/public/unlisted content
5. **Performance Optimized**: No N+1 queries, minimal database round trips

#### Core Methods:

```typescript
// Polymorphic querying with content JOINs
async findAll(filters?: MediaFiltersInput, userId?: string) {
  // Single query with includes for both image and textContent
  // Visibility filtering based on user permissions
  // Type filtering using nullable FK checks
}

// Content creation with transactions
async createTextMedia(userId: string, input: CreateTextMediaInput) {
  // Transaction ensures atomicity:
  // 1. Create TextContent record
  // 2. Create Media record with textContentId
}
```

### Type Resolution

The system uses several approaches for type resolution:

1. **Database Level**: Nullable FK constraints ensure only one content type per media
2. **GraphQL Level**: Union types and resolvers determine return types
3. **Service Level**: Type-specific methods like `createTextMedia()`

```typescript
// GraphQL Union Type Resolution
// apps/backend/src/media/entities/media.entity.ts:159-171
export const MediaContentUnion = createUnionType({
  name: 'MediaContent',
  types: () => [Image, TextContent] as const,
  resolveType(value) {
    if ('url' in value) return Image;
    if ('content' in value) return TextContent;
    return null;
  },
});
```

## GraphQL API Design

### Queries

The resolver (`apps/backend/src/media/media.resolver.ts`) exposes unified endpoints:

- `media()` - Paginated media with filters
- `mediaItem(id)` - Single media by ID
- `myMedia()` - Current user's media
- `userMedia(userId)` - Specific user's media
- `characterMedia(characterId)` - Character-associated media
- `galleryMedia(galleryId)` - Gallery-contained media

### Mutations

- `createTextMedia()` - Create new text content
- `updateMedia()` - Update metadata (title, description, etc.)
- `updateTextContent()` - Update text-specific content
- `deleteMedia()` - Remove media and associated content
- `addMediaTags()` / `removeMediaTags()` - Tag management

### Filtering and Pagination

```typescript
// apps/backend/src/media/dto/media.dto.ts:22-73
export class MediaFiltersInput {
  search?: string        // Search in title/description
  mediaType?: MediaType  // Filter by IMAGE or TEXT
  visibility?: Visibility // Filter by visibility level
  ownerId?: string       // Filter by owner
  characterId?: string   // Filter by character
  galleryId?: string     // Filter by gallery
  limit?: number         // Pagination limit
  offset?: number        // Pagination offset
}
```

## Performance Characteristics

### Advantages

1. **Single Query Fetching**: Content is fetched via JOINs, not separate queries
2. **Index Efficiency**: Nullable FKs are indexed and efficient for filtering
3. **No Discriminator Overhead**: No need for additional type columns
4. **Type Safety**: TypeScript ensures proper content access

### Query Patterns

```sql
-- Efficient type filtering using nullable FKs
SELECT * FROM media 
WHERE imageId IS NOT NULL     -- Images only
   OR textContentId IS NOT NULL -- Text only

-- Content JOINs in single query
SELECT m.*, i.url, t.content, t.wordCount
FROM media m
LEFT JOIN image i ON m.imageId = i.id
LEFT JOIN textContent t ON m.textContentId = t.id
```

## Content Management Patterns

### Creation Flow

1. **Text Media**: Create `TextContent` → Create `Media` with `textContentId`
2. **Image Media**: Upload handled by `ImagesService` → Create `Media` with `imageId`

### Update Patterns

- **Metadata Updates**: Direct `Media` table updates
- **Content Updates**: Update linked content table (preserves media metadata)
- **Type Changes**: Not supported (would require complex migration)

### Deletion

- **CASCADE Constraints**: Deleting `Media` cascades to remove content
- **Orphan Prevention**: Content tables are never directly deleted

## Integration Points

### Character Association

Media can be associated with characters for:
- Character galleries/portfolios
- Main character images
- Character-specific text content (bios, stories)

### Gallery System

Media can belong to galleries for:
- Organized collections
- Thematic groupings
- User curation

### Social Features

Unified social features across all media types:
- Likes/favorites
- Comments (via separate system)
- Tagging
- Visibility controls

## Extension Patterns

### Adding New Content Types

To add a new content type (e.g., `VideoContent`):

1. Create new content entity
2. Add nullable FK to `Media` entity: `videoContentId?`
3. Update `MediaContentUnion` resolver
4. Add type to `MediaType` enum
5. Implement content-specific service methods
6. Update filtering logic in `MediaService`

### Content-Specific Features

Each content type can have unique features:
- **Images**: Thumbnails, NSFW detection, artist attribution
- **Text**: Word counts, formatting options, search indexing
- **Future Types**: Duration (video), sample rate (audio), etc.

## Security Considerations

### Visibility Controls

- **PUBLIC**: Visible to all users
- **UNLISTED**: Accessible by direct link only
- **PRIVATE**: Only visible to owner

### Access Patterns

```typescript
// Visibility filtering in queries
const where: Prisma.MediaWhereInput = {
  OR: [
    { visibility: "PUBLIC" },
    { visibility: "UNLISTED" },
    // Private content only for owner
    userId ? { 
      AND: [{ visibility: "PRIVATE" }, { ownerId: userId }] 
    } : { id: "never-matches" }
  ]
};
```

### Content Validation

- Input validation through DTOs with `class-validator`
- Type-specific validation (word count limits, file size limits)
- Ownership verification for all mutations

## Monitoring and Observability

The system includes comprehensive tracing and metrics:
- Database query performance monitoring
- Content type distribution tracking
- User engagement metrics across media types
- Error tracking for failed operations

This polymorphic design provides a robust, extensible foundation for managing diverse media content while maintaining performance and type safety throughout the application.