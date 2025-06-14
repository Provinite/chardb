# ThClone - Character Hosting Platform

A modern, feature-rich character hosting and art sharing platform built with NestJS, React, and TypeScript. Think of it as a next-generation alternative to toyhou.se with enhanced features and performance.

## 🌟 Features

- **Character Profiles**: Create detailed character profiles with custom fields, personality traits, and backstories
- **Image Galleries**: Upload and organize artwork, reference images, and character art
- **Social Features**: Follow users, comment on characters, and engage with the community
- **Privacy Controls**: Granular privacy settings for characters and galleries
- **Tagging System**: Organize and discover content with flexible tagging
- **Character Trading**: Mark characters as sellable or tradeable
- **Modern UI**: Responsive design with dark/light theme support

## 🏗️ Architecture

### Monorepo Structure
```
thclone/
├── apps/
│   ├── backend/          # NestJS API with GraphQL
│   └── frontend/         # React application
├── packages/
│   ├── shared/           # Shared TypeScript types and utilities
│   ├── database/         # Prisma schema and database utilities
│   └── ui/              # Shared UI component library
├── docker/              # Docker configuration
└── .github/workflows/   # CI/CD pipelines
```

### Tech Stack
- **Backend**: NestJS, GraphQL (Apollo), Prisma ORM, PostgreSQL
- **Frontend**: React 18, TypeScript, Apollo Client, Styled Components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 (configurable)
- **Caching**: Redis
- **Testing**: Jest, React Testing Library
- **Deployment**: Docker, GitHub Actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Yarn 4.x
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd thclone
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   
   # Edit the .env files with your configuration
   ```

4. **Start the development environment**
   ```bash
   # Start PostgreSQL and Redis with Docker
   docker compose -f docker/docker compose.yml up postgres redis -d
   
   # Generate Prisma client and run migrations
   yarn workspace @thclone/database db:generate
   yarn workspace @thclone/database db:migrate
   
   # Seed the database (optional)
   yarn workspace @thclone/database db:seed
   ```

5. **Start the applications**
   ```bash
   # Start backend (in one terminal)
   yarn workspace @thclone/backend dev
   
   # Start frontend (in another terminal)
   yarn workspace @thclone/frontend dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - GraphQL Playground: http://localhost:4000/graphql

### Using Docker (Alternative)

```bash
# Start everything with Docker Compose
docker compose -f docker/docker compose.yml up

# The application will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
```

## 📝 Available Scripts

### Root Level
- `yarn build` - Build all packages and applications
- `yarn dev` - Start all applications in development mode
- `yarn test` - Run tests for all packages
- `yarn lint` - Lint all code
- `yarn type-check` - Type check all TypeScript code

### Backend (`apps/backend`)
- `yarn dev` - Start development server with hot reload
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn test` - Run unit tests
- `yarn test:e2e` - Run end-to-end tests
- `yarn db:migrate` - Run database migrations
- `yarn db:seed` - Seed database with sample data

### Frontend (`apps/frontend`)
- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn test` - Run tests with Vitest

## 🗄️ Database Schema

The application uses PostgreSQL with Prisma ORM. Key entities include:

- **Users**: User accounts with authentication and profile information
- **Characters**: Character profiles with detailed information
- **Images**: Uploaded artwork and images
- **Galleries**: Collections of images
- **Comments**: User comments on various entities
- **Follows**: User following relationships
- **Likes**: User likes on content
- **Tags**: Tagging system for organization

## 🔧 Configuration

### Environment Variables

#### Backend (`apps/backend/.env`)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/thclone_db"
JWT_SECRET="your-super-secret-jwt-key"
REDIS_URL="redis://localhost:6379"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_BUCKET_NAME="your-s3-bucket"
```

#### Frontend (`apps/frontend/.env`)
```env
VITE_GRAPHQL_URL="http://localhost:4000/graphql"
```

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run backend tests
yarn workspace @thclone/backend test

# Run frontend tests
yarn workspace @thclone/frontend test

# Run tests with coverage
yarn workspace @thclone/backend test:cov
```

## 🚢 Deployment

### Production Build
```bash
# Build all packages
yarn build

# Build Docker images
docker build -f docker/Dockerfile.backend -t thclone-backend .
docker build -f docker/Dockerfile.frontend -t thclone-frontend .
```

### Production Deployment
```bash
# Using Docker Compose
docker compose -f docker/docker compose.prod.yml up -d
```

The application includes GitHub Actions workflows for:
- **CI**: Automated testing, linting, and building
- **CD**: Automated deployment to staging and production environments

## 📊 Monitoring & Observability

- Health check endpoints for all services
- Structured logging with request correlation IDs
- Performance monitoring ready
- Error tracking integration points

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Use conventional commit messages
- Ensure all CI checks pass
- Update documentation as needed

## 📈 Roadmap

### Phase 1 (Current) ✅
- [x] Basic project structure and monorepo setup
- [x] User authentication and authorization
- [x] Database schema and models
- [x] GraphQL API foundation
- [x] React frontend with routing
- [x] Docker containerization
- [x] CI/CD pipelines

### Phase 2 (Next)
- [ ] Character CRUD operations
- [ ] Image upload and management
- [ ] Gallery system
- [ ] User profiles and dashboards
- [ ] Basic search functionality

### Phase 3 (Future)
- [ ] Social features (comments, likes, follows)
- [ ] Advanced search and filtering
- [ ] Character trading system
- [ ] Notification system
- [ ] Admin panel

### Phase 4 (Advanced)
- [ ] Real-time features with WebSockets
- [ ] Advanced image processing
- [ ] Mobile application
- [ ] API rate limiting and caching
- [ ] Performance optimizations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/thclone/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

## 🙏 Acknowledgments

- Inspired by toyhou.se and similar character hosting platforms
- Built with modern web technologies and best practices
- Community-driven feature requests and feedback

---

**Built with ❤️ by the ThClone team**
