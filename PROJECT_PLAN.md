# Toyhou.se Clone - Comprehensive Development Plan

## Project Overview

A feature-rich clone of toyhou.se built as a modern monorepo application using NestJS/React with TypeScript, PostgreSQL, and Docker deployment.

## Tech Stack

### Core Technologies
- **Backend**: NestJS with TypeScript
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **API**: GraphQL (Apollo)
- **Testing**: Jest (unit & integration)
- **Deployment**: Docker containers
- **CI/CD**: GitHub Actions

### Additional Tools
- **Monorepo**: Yarn workspaces
- **Authentication**: JWT with refresh tokens
- **File Storage**: Cloud storage (AWS S3/Google Cloud)
- **Caching**: Redis (for sessions and data caching)
- **Image Processing**: Sharp for resizing/optimization

## Project Structure

```
thclone/
├── apps/
│   ├── backend/                    # NestJS application
│   │   ├── src/
│   │   │   ├── auth/              # Authentication module
│   │   │   ├── users/             # User management
│   │   │   ├── characters/        # Character management
│   │   │   ├── images/            # Image upload/management
│   │   │   ├── galleries/         # Gallery management
│   │   │   ├── comments/          # Comment system
│   │   │   ├── social/            # Follow/like features
│   │   │   ├── graphql/           # GraphQL schema & resolvers
│   │   │   ├── common/            # Guards, decorators, pipes
│   │   │   └── main.ts
│   │   ├── test/                  # E2E tests
│   │   ├── prisma/               # Database schema & migrations
│   │   └── package.json
│   └── frontend/                  # React application
│       ├── src/
│       │   ├── components/        # Reusable components
│       │   ├── pages/            # Page components
│       │   ├── hooks/            # Custom hooks
│       │   ├── graphql/          # GraphQL queries/mutations
│       │   ├── auth/             # Authentication logic
│       │   ├── utils/            # Utility functions
│       │   └── App.tsx
│       ├── public/
│       └── package.json
├── packages/
│   ├── shared/                    # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── types/            # Common types
│   │   │   └── utils/            # Shared utilities
│   │   └── package.json
│   ├── database/                  # Prisma shared package
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   └── ui/                       # Shared UI components
│       ├── src/
│       │   ├── components/       # Base components
│       │   └── styles/           # Shared styles
│       └── package.json
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml        # Local development
│   └── docker-compose.prod.yml   # Production
├── .github/
│   └── workflows/
│       ├── ci.yml                # Continuous integration
│       └── deploy.yml            # Deployment pipeline
├── docs/                         # Project documentation
├── package.json                  # Root workspace config
├── jest.config.js               # Jest configuration
├── .env.example                 # Environment variables template
└── README.md
```

## Database Schema Design

### Core Entities

#### Users
```sql
- id: UUID (Primary Key)
- username: String (Unique)
- email: String (Unique)
- password_hash: String
- display_name: String?
- bio: Text?
- avatar_url: String?
- location: String?
- website: String?
- date_of_birth: Date?
- is_verified: Boolean
- is_admin: Boolean
- privacy_settings: JSON
- created_at: DateTime
- updated_at: DateTime
```

#### Characters
```sql
- id: UUID (Primary Key)
- name: String
- species: String?
- age: String?
- gender: String?
- description: Text?
- personality: Text?
- backstory: Text?
- owner_id: UUID (Foreign Key -> Users)
- creator_id: UUID? (Foreign Key -> Users, for gifted characters)
- visibility: Enum (PUBLIC, UNLISTED, PRIVATE)
- is_sellable: Boolean
- is_tradeable: Boolean
- price: Decimal?
- tags: String[]
- custom_fields: JSON
- created_at: DateTime
- updated_at: DateTime
```

#### Images
```sql
- id: UUID (Primary Key)
- filename: String
- original_filename: String
- url: String
- thumbnail_url: String?
- alt_text: String?
- description: Text?
- uploader_id: UUID (Foreign Key -> Users)
- character_id: UUID? (Foreign Key -> Characters)
- gallery_id: UUID? (Foreign Key -> Galleries)
- width: Integer
- height: Integer
- file_size: Integer
- mime_type: String
- is_nsfw: Boolean
- visibility: Enum (PUBLIC, UNLISTED, PRIVATE)
- created_at: DateTime
- updated_at: DateTime
```

#### Galleries
```sql
- id: UUID (Primary Key)
- name: String
- description: Text?
- owner_id: UUID (Foreign Key -> Users)
- character_id: UUID? (Foreign Key -> Characters)
- visibility: Enum (PUBLIC, UNLISTED, PRIVATE)
- sort_order: Integer
- created_at: DateTime
- updated_at: DateTime
```

#### Comments
```sql
- id: UUID (Primary Key)
- content: Text
- author_id: UUID (Foreign Key -> Users)
- commentable_type: String (Character, Image, Gallery, User)
- commentable_id: UUID
- parent_id: UUID? (Foreign Key -> Comments, for nested comments)
- is_hidden: Boolean
- created_at: DateTime
- updated_at: DateTime
```

#### Follows
```sql
- id: UUID (Primary Key)
- follower_id: UUID (Foreign Key -> Users)
- following_id: UUID (Foreign Key -> Users)
- created_at: DateTime
- UNIQUE(follower_id, following_id)
```

#### Likes
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key -> Users)
- likeable_type: String (Character, Image, Gallery, Comment)
- likeable_id: UUID
- created_at: DateTime
- UNIQUE(user_id, likeable_type, likeable_id)
```

#### Tags
```sql
- id: UUID (Primary Key)
- name: String (Unique)
- category: String?
- color: String?
- created_at: DateTime
```

#### Character_Tags (Many-to-Many)
```sql
- character_id: UUID (Foreign Key -> Characters)
- tag_id: UUID (Foreign Key -> Tags)
- PRIMARY KEY(character_id, tag_id)
```

#### Image_Tags (Many-to-Many)
```sql
- image_id: UUID (Foreign Key -> Images)
- tag_id: UUID (Foreign Key -> Tags)
- PRIMARY KEY(image_id, tag_id)
```

## Development Phases

### Phase 1: Foundation Setup (Week 1-2)
1. **Monorepo Structure**
   - Set up Yarn workspaces
   - Configure TypeScript for all packages
   - Set up shared package dependencies

2. **Backend Foundation**
   - Initialize NestJS application
   - Configure Prisma with PostgreSQL
   - Set up GraphQL with Apollo Server
   - Implement basic health check endpoint

3. **Frontend Foundation**
   - Initialize React application with TypeScript
   - Set up GraphQL client (Apollo Client)
   - Configure routing (React Router)
   - Set up basic styling system

4. **Development Environment**
   - Docker Compose for local development
   - Environment configuration
   - Hot reload setup

### Phase 2: Authentication & Core Backend (Week 3-4)
1. **Authentication System**
   - JWT token generation and validation
   - Refresh token mechanism
   - Password hashing with bcrypt
   - Rate limiting for auth endpoints

2. **User Management**
   - User registration/login GraphQL mutations
   - User profile queries and updates
   - Email verification system
   - Password reset functionality

3. **Database Implementation**
   - Complete Prisma schema implementation
   - Database migrations
   - Seed data for development

4. **Authorization**
   - GraphQL guards and decorators
   - Role-based access control
   - Resource ownership validation

### Phase 3: Core Features Backend (Week 5-6)
1. **Character Management**
   - CRUD operations for characters
   - Character ownership and permissions
   - Character search and filtering
   - Tag system implementation

2. **Image Upload Service**
   - File upload endpoint with validation
   - Image processing and thumbnails
   - Cloud storage integration
   - NSFW content handling

3. **Gallery System**
   - Gallery CRUD operations
   - Image-gallery associations
   - Gallery sorting and organization

### Phase 4: Frontend Core Features (Week 7-8)
1. **Authentication UI**
   - Login/registration forms
   - Password reset flow
   - User profile management
   - Authentication state management

2. **Character Interface**
   - Character creation form
   - Character profile pages
   - Character browsing/search
   - Character editing interface

3. **Image & Gallery Management**
   - Image upload interface
   - Gallery creation and management
   - Image viewer/carousel
   - Responsive image display

4. **Developer Experience Improvements**
   - GraphQL Code Generation setup
   - Automatic TypeScript type generation from schema
   - Refactor existing GraphQL operations to use generated types
   - Enhanced type safety and IntelliSense

### Phase 5: Social Features (Week 9-10)
1. **Comment System**
   - Comment components
   - Nested comment threads
   - Comment moderation
   - Real-time updates (WebSocket/GraphQL subscriptions)

2. **Social Interactions**
   - Follow/unfollow functionality
   - Like system
   - User activity feeds
   - Notification system

### Phase 6: Advanced Features (Week 11-12)
1. **Character Trading**
   - Trading proposals
   - Trading history
   - Price management
   - Trading notifications

2. **Search & Discovery**
   - Advanced search filters
   - Tag-based browsing
   - Trending content
   - Recommendation system

3. **Admin Panel**
   - User management
   - Content moderation
   - Site statistics
   - System configuration

### Phase 7: Testing & Quality Assurance (Week 13-14)
1. **Backend Testing**
   - Unit tests for services and resolvers
   - Integration tests for GraphQL endpoints
   - Database testing with test containers
   - Authentication and authorization tests

2. **Frontend Testing**
   - Component unit tests
   - Integration tests for user flows
   - E2E tests with Playwright/Cypress
   - Accessibility testing

3. **Performance Optimization**
   - Database query optimization
   - GraphQL query complexity analysis
   - Image optimization
   - Bundle size optimization

### Phase 8: Deployment & DevOps (Week 15-16)
1. **Docker Configuration**
   - Production Dockerfiles
   - Multi-stage builds
   - Health checks and monitoring

2. **CI/CD Pipeline**
   - GitHub Actions workflows
   - Automated testing
   - Security scanning
   - Deployment automation

3. **Production Setup**
   - Environment configuration
   - Database migration strategy
   - Monitoring and logging
   - Backup and recovery

## GraphQL API Design

### Queries
```graphql
type Query {
  # User queries
  user(id: ID, username: String): User
  users(limit: Int, offset: Int, search: String): UserConnection
  me: User
  
  # Character queries
  character(id: ID!): Character
  characters(
    limit: Int
    offset: Int
    ownerId: ID
    species: String
    tags: [String!]
    search: String
  ): CharacterConnection
  
  # Image queries
  image(id: ID!): Image
  images(
    limit: Int
    offset: Int
    uploaderId: ID
    characterId: ID
    galleryId: ID
  ): ImageConnection
  
  # Gallery queries
  gallery(id: ID!): Gallery
  galleries(
    limit: Int
    offset: Int
    ownerId: ID
    characterId: ID
  ): GalleryConnection
  
  # Comment queries
  comments(
    entityType: CommentableType!
    entityId: ID!
    limit: Int
    offset: Int
  ): CommentConnection
  
  # Social queries
  followers(userId: ID!): UserConnection
  following(userId: ID!): UserConnection
  feed(limit: Int, offset: Int): FeedConnection
}
```

### Mutations
```graphql
type Mutation {
  # Authentication
  signup(input: SignupInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  refreshToken(token: String!): AuthPayload!
  logout: Boolean!
  
  # User management
  updateProfile(input: UpdateProfileInput!): User!
  changePassword(input: ChangePasswordInput!): Boolean!
  deleteAccount: Boolean!
  
  # Character management
  createCharacter(input: CreateCharacterInput!): Character!
  updateCharacter(id: ID!, input: UpdateCharacterInput!): Character!
  deleteCharacter(id: ID!): Boolean!
  
  # Image management
  uploadImage(input: UploadImageInput!): Image!
  updateImage(id: ID!, input: UpdateImageInput!): Image!
  deleteImage(id: ID!): Boolean!
  
  # Gallery management
  createGallery(input: CreateGalleryInput!): Gallery!
  updateGallery(id: ID!, input: UpdateGalleryInput!): Gallery!
  deleteGallery(id: ID!): Boolean!
  addImageToGallery(galleryId: ID!, imageId: ID!): Boolean!
  removeImageFromGallery(galleryId: ID!, imageId: ID!): Boolean!
  
  # Comments
  addComment(input: AddCommentInput!): Comment!
  updateComment(id: ID!, content: String!): Comment!
  deleteComment(id: ID!): Boolean!
  
  # Social interactions
  followUser(userId: ID!): Boolean!
  unfollowUser(userId: ID!): Boolean!
  likeEntity(entityType: LikeableType!, entityId: ID!): Boolean!
  unlikeEntity(entityType: LikeableType!, entityId: ID!): Boolean!
}
```

### Subscriptions
```graphql
type Subscription {
  commentAdded(entityType: CommentableType!, entityId: ID!): Comment!
  notificationReceived: Notification!
  activityFeedUpdated: FeedItem!
}
```

## Security Considerations

### Authentication & Authorization
- JWT tokens with short expiration (15 minutes)
- Refresh tokens with longer expiration (7 days)
- Rate limiting on authentication endpoints
- Password strength requirements
- Account lockout after failed attempts

### Data Protection
- Input validation and sanitization
- SQL injection prevention (Prisma ORM)
- XSS protection
- CORS configuration
- HTTPS enforcement
- File upload validation and scanning

### Privacy Features
- Granular privacy controls
- Content visibility settings
- User blocking functionality
- Report system for inappropriate content
- GDPR compliance features

## Performance Optimization

### Backend Optimization
- Database indexing strategy
- Query optimization with Prisma
- Connection pooling
- Redis caching for sessions and frequently accessed data
- GraphQL query complexity analysis
- Rate limiting and throttling

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization and lazy loading
- Bundle size optimization
- Memoization of expensive components
- Virtual scrolling for large lists
- Progressive Web App features

## Testing Strategy

### Backend Testing
```
- Unit Tests (80% coverage target)
  - Services and business logic
  - GraphQL resolvers
  - Authentication guards
  - Utility functions

- Integration Tests
  - Database operations
  - GraphQL endpoint flows
  - Authentication workflows
  - File upload processes

- E2E Tests
  - Critical user journeys
  - API endpoint interactions
  - Database migration testing
```

### Frontend Testing
```
- Unit Tests
  - Component rendering
  - Hook functionality
  - Utility functions
  - State management

- Integration Tests
  - User interaction flows
  - GraphQL integration
  - Routing behavior
  - Form submissions

- E2E Tests
  - Complete user workflows
  - Cross-browser compatibility
  - Performance testing
```

## Deployment Architecture

### Development Environment
- Docker Compose with hot reload
- Local PostgreSQL database
- Mock external services
- Development-specific environment variables

### Staging Environment
- Kubernetes cluster or Docker Swarm
- Staged database with production-like data
- Full external service integration
- Performance and load testing

### Production Environment
- Load-balanced application instances
- Managed PostgreSQL database
- CDN for static assets
- Monitoring and alerting
- Automated backups and disaster recovery

## CI/CD Pipeline

### Continuous Integration
```yaml
# .github/workflows/ci.yml
- Code quality checks (ESLint, Prettier)
- TypeScript compilation
- Unit and integration tests
- Security vulnerability scanning
- Docker image building
- Test coverage reporting
```

### Continuous Deployment
```yaml
# .github/workflows/deploy.yml
- Automated deployment to staging
- Smoke tests on staging
- Manual approval for production
- Blue-green deployment strategy
- Rollback capabilities
- Post-deployment verification
```

## Monitoring & Observability

### Application Monitoring
- Health check endpoints
- Application performance monitoring (APM)
- Error tracking and alerting
- User analytics and behavior tracking
- Resource usage monitoring

### Infrastructure Monitoring
- Container health and resource usage
- Database performance metrics
- Network latency and throughput
- Storage usage and performance
- External service dependency monitoring

## Future Enhancements

### Phase 2 Features
- Mobile application (React Native)
- Advanced character relationship mapping
- Character design commission system
- Virtual pet/creature breeding mechanics
- AR character viewer
- Blockchain-based character ownership

### Scalability Improvements
- Microservices architecture migration
- Event-driven architecture with message queues
- Advanced caching strategies
- Database sharding for large datasets
- Global CDN for international users

## Risk Mitigation

### Technical Risks
- Database performance at scale → Implement caching and optimization early
- File storage costs → Implement image compression and cleanup policies
- Third-party service dependencies → Implement fallbacks and monitoring

### Business Risks
- Content moderation at scale → Automated content scanning and reporting system
- User privacy compliance → Built-in privacy controls and audit trails
- Copyright infringement → DMCA compliance and takedown procedures

## Success Metrics

### Technical Metrics
- 99.9% uptime target
- < 2 second page load times
- 95% test coverage
- Zero critical security vulnerabilities

### User Experience Metrics
- User registration and retention rates
- Character creation and engagement rates
- Image upload success rates
- Social interaction rates (comments, likes, follows)

## Resource Requirements

### Development Team
- 1 Backend Developer (NestJS/GraphQL)
- 1 Frontend Developer (React/TypeScript)
- 1 DevOps Engineer (Docker/CI/CD)
- 1 UI/UX Designer

### Infrastructure Costs (Monthly Estimates)
- Cloud hosting: $200-500
- Database: $100-300
- File storage: $50-200
- CDN: $50-100
- Monitoring tools: $50-100

Total estimated monthly cost: $450-1200 depending on scale

---

This plan provides a comprehensive roadmap for building a robust, scalable toyhou.se clone with modern web technologies. The phased approach ensures steady progress while maintaining code quality and user experience standards.