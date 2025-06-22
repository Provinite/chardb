│ │ Text-Based Media Implementation Plan                                                                                                                                      │ │
│ │                                                                                                                                                                           │ │
│ │ Overview                                                                                                                                                                  │ │
│ │                                                                                                                                                                           │ │
│ │ Implement polymorphic media system to support both images and text content (stories, descriptions, roleplay logs) following the architecture specified in GitHub issue    │ │
│ │ #5.                                                                                                                                                                       │ │
│ │                                                                                                                                                                           │ │
│ │ Phase 1: Database Schema Changes                                                                                                                                          │ │
│ │                                                                                                                                                                           │ │
│ │ 1. Add new tables to Prisma schema:                                                                                                                                       │ │
│ │   - Media table (base entity with metadata, relationships, ownership)                                                                                                     │ │
│ │   - TextContent table (text-specific data: content, word_count, formatting)                                                                                               │ │
│ │   - Add MediaType enum (IMAGE, TEXT)                                                                                                                                      │ │
│ │   - Add TextFormatting enum (PLAINTEXT, MARKDOWN)                                                                                                                         │ │
│ │ 2. Generate and run migration:                                                                                                                                            │ │
│ │   - Create new tables without breaking existing schema                                                                                                                    │ │
│ │   - Preserve all existing Image table data                                                                                                                                │ │
│ │                                                                                                                                                                           │ │
│ │ Phase 2: Data Migration                                                                                                                                                   │ │
│ │                                                                                                                                                                           │ │
│ │ 1. Populate Media table from existing Images:                                                                                                                             │ │
│ │   - Create Media record for each existing Image                                                                                                                           │ │
│ │   - Set media_type = 'IMAGE' and content_id = image.id                                                                                                                    │ │
│ │   - Preserve all metadata (title, description, owner, character, gallery, visibility)                                                                                     │ │
│ │ 2. Update foreign key references:                                                                                                                                         │ │
│ │   - Character.mainImageId → Character.mainMediaId                                                                                                                         │ │
│ │   - Comment.imageId → Comment.mediaId                                                                                                                                     │ │
│ │   - Like.imageId → Like.mediaId                                                                                                                                           │ │
│ │   - Gallery-image relations → Gallery-media relations                                                                                                                     │ │
│ │                                                                                                                                                                           │ │
│ │ Phase 3: Backend GraphQL Schema                                                                                                                                           │ │
│ │                                                                                                                                                                           │ │
│ │ 1. Create new types:                                                                                                                                                      │ │
│ │   - Media type with union field for Image | TextContent                                                                                                                   │ │
│ │   - TextContent type with content, wordCount, formatting fields                                                                                                           │ │
│ │   - MediaConnection type for paginated results                                                                                                                            │ │
│ │ 2. Update resolvers:                                                                                                                                                      │ │
│ │   - New media and myMedia queries (parallel to existing image queries)                                                                                                    │ │
│ │   - CRUD mutations for text media                                                                                                                                         │ │
│ │   - Update character/gallery resolvers to return Media instead of Image                                                                                                   │ │
│ │   - Extend search to include text content                                                                                                                                 │ │
│ │ 3. Maintain backward compatibility:                                                                                                                                       │ │
│ │   - Keep existing image endpoints during transition                                                                                                                       │ │
│ │   - Gradual migration of frontend to use new Media endpoints                                                                                                              │ │
│ │                                                                                                                                                                           │ │
│ │ Phase 4: Frontend Components                                                                                                                                              │ │
│ │                                                                                                                                                                           │ │
│ │ 1. Create new media components:                                                                                                                                           │ │
│ │   - MediaCard component handling both image and text previews                                                                                                             │ │
│ │   - TextViewer component for full text display                                                                                                                            │ │
│ │   - TextEditor component for text creation/editing                                                                                                                        │ │
│ │   - MediaGrid component for mixed galleries                                                                                                                               │ │
│ │ 2. Update existing components:                                                                                                                                            │ │
│ │   - CharacterImageGallery → CharacterMediaGallery                                                                                                                         │ │
│ │   - Media upload modal to support text creation                                                                                                                           │ │
│ │   - Character pages to show mixed media seamlessly                                                                                                                        │ │
│ │ 3. Text-specific UI:                                                                                                                                                      │ │
│ │   - Text preview cards with "Read more" functionality                                                                                                                     │ │
│ │   - Word count indicators                                                                                                                                                 │ │
│ │   - Markdown preview for rich text                                                                                                                                        │ │
│ │                                                                                                                                                                           │ │
│ │ Phase 5: Integration & Testing                                                                                                                                            │ │
│ │                                                                                                                                                                           │ │
│ │ 1. Upload flow updates:                                                                                                                                                   │ │
│ │   - Extend media creation to support text input                                                                                                                           │ │
│ │   - Character/gallery assignment for text media                                                                                                                           │ │
│ │   - Same ownership/transfer mechanics as images                                                                                                                           │ │
│ │ 2. Search integration:                                                                                                                                                    │ │
│ │   - Include text content in media search                                                                                                                                  │ │
│ │   - Filter by media type (image/text/all)                                                                                                                                 │ │
│ │ 3. Comprehensive testing:                                                                                                                                                 │ │
│ │   - All existing image functionality still works                                                                                                                          │ │
│ │   - New text media features work in galleries                                                                                                                             │ │
│ │   - Character pages display mixed media correctly                                                                                                                         │ │
│ │   - Search includes text content                                                                                                                                          │ │
│ │                                                                                                                                                                           │ │
│ │ Key Implementation Notes                                                                                                                                                  │ │
│ │                                                                                                                                                                           │ │
│ │ Database Schema (Exact per GitHub issue):                                                                                                                                 │ │
│ │                                                                                                                                                                           │ │
│ │ model Media {                                                                                                                                                             │ │
│ │   id          String      @id @default(uuid())                                                                                                                            │ │
│ │   title       String      @db.VarChar(255)                                                                                                                                │ │
│ │   description String?     @db.Text                                                                                                                                        │ │
│ │   ownerId     String      @map("owner_id")                                                                                                                                │ │
│ │   characterId String?     @map("character_id")                                                                                                                            │ │
│ │   visibility  Visibility  @default(PUBLIC)                                                                                                                                │ │
│ │   mediaType   MediaType   @map("media_type")                                                                                                                              │ │
│ │   contentId   String      @map("content_id")                                                                                                                              │ │
│ │   createdAt   DateTime    @default(now()) @map("created_at")                                                                                                              │ │
│ │   updatedAt   DateTime    @updatedAt @map("updated_at")                                                                                                                   │ │
│ │                                                                                                                                                                           │ │
│ │   owner     User       @relation(fields: [ownerId], references: [id])                                                                                                     │ │
│ │   character Character? @relation(fields: [characterId], references: [id])                                                                                                 │ │
│ │ }                                                                                                                                                                         │ │
│ │                                                                                                                                                                           │ │
│ │ model TextContent {                                                                                                                                                       │ │
│ │   id         String          @id @default(uuid())                                                                                                                         │ │
│ │   content    String          @db.Text                                                                                                                                     │ │
│ │   wordCount  Int             @map("word_count")                                                                                                                           │ │
│ │   formatting TextFormatting  @default(PLAINTEXT)                                                                                                                          │ │
│ │ }                                                                                                                                                                         │ │
│ │                                                                                                                                                                           │ │
│ │ enum MediaType {                                                                                                                                                          │ │
│ │   IMAGE                                                                                                                                                                   │ │
│ │   TEXT                                                                                                                                                                    │ │
│ │ }                                                                                                                                                                         │ │
│ │                                                                                                                                                                           │ │
│ │ enum TextFormatting {                                                                                                                                                     │ │
│ │   PLAINTEXT                                                                                                                                                               │ │
│ │   MARKDOWN                                                                                                                                                                │ │
│ │ }                                                                                                                                                                         │ │
│ │                                                                                                                                                                           │ │
│ │ Frontend Pattern:                                                                                                                                                         │ │
│ │                                                                                                                                                                           │ │
│ │ const MediaCard = ({ media }: { media: Media }) => {                                                                                                                      │ │
│ │   switch (media.mediaType) {                                                                                                                                              │ │
│ │     case 'IMAGE':                                                                                                                                                         │ │
│ │       return <ImageMediaCard media={media} image={media.image} />;                                                                                                        │ │
│ │     case 'TEXT':                                                                                                                                                          │ │
│ │       return <TextMediaCard media={media} textContent={media.textContent} />;                                                                                             │ │
│ │   }                                                                                                                                                                       │ │
│ │ };                                                                                                                                                                        │ │
│ │                                                                                                                                                                           │ │
│ │ Risk Mitigation                                                                                                                                                           │ │
│ │                                                                                                                                                                           │ │
│ │ - Additive schema changes first (no breaking changes)                                                                                                                     │ │
│ │ - Parallel implementation (old system continues working)                                                                                                                  │ │
│ │ - Comprehensive data migration with rollback plan                                                                                                                         │ │
│ │ - Incremental frontend updates                                                                                                                                            │ │
│ │ - Extensive testing at each phase                                                                                                                                         │ │
│ │                                                                                                                                                                           │ │
│ │ Success Criteria                                                                                                                                                          │ │
│ │                                                                                                                                                                           │ │
│ │ - ✅ Text media works in all existing gallery features                                                                                                                     │ │
│ │ - ✅ Character pages show text alongside images seamlessly                                                                                                                 │ │
│ │ - ✅ Media search includes text content                                                                                                                                    │ │
│ │ - ✅ All media management features work (transfer, delete, edit)                                                                                                           │ │
│ │ - ✅ Migration completes without data loss                                                                                                                                 │ │
│ │ - ✅ No performance degradation                                                                                                                                            │ │