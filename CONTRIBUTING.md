# Contributing to Plunk

Thank you for your interest in contributing to Plunk! This guide will help you get started with development.

## Architecture

Plunk V2 is built as a modern Turborepo monorepo with the following structure:

### Applications (`apps/`)

- **api**: Express.js API server with background worker process (BullMQ)
- **web**: Next.js dashboard application (app.useplunk.com)
- **landing**: Next.js marketing site (www.useplunk.com)
- **wiki**: Next.js documentation site (docs.useplunk.com)

### Shared Packages (`packages/`)

- **@plunk/db**: Prisma database schema and client
- **@plunk/ui**: Shared UI components (ShadCN + Radix UI)
- **@plunk/shared**: Common utilities and business logic
- **@plunk/types**: TypeScript type definitions
- **@plunk/email**: React Email templates

### Technology Stack

- **Frontend**: React 19, Next.js 15, Tailwind CSS, Framer Motion
- **Backend**: Express.js, TypeScript (ESM), Prisma ORM
- **Database**: PostgreSQL with connection pooling
- **Cache/Queue**: Redis, BullMQ for background jobs
- **Email Delivery**: AWS SES with bounce/complaint handling
- **Storage**: S3-compatible (MinIO, AWS S3)
- **Payments**: Stripe with usage-based billing

## Development Setup

For local development without Docker:

### Prerequisites

- Node.js 20+
- Yarn 4.9+
- Docker & Docker Compose (for services)

### Quick Start

```bash
# Clone and install
git clone <repo-url>
cd app
yarn install

# Start infrastructure services (PostgreSQL, Redis, MinIO)
yarn services:up

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
yarn workspace @plunk/db migrate:dev

# Start all development servers
yarn dev
```

**Note**: The `dev` command starts the API server, worker process, and web apps. For production-like setup or debugging,
you can run components separately:

```bash
# Terminal 1: API Server
yarn workspace api dev:server

# Terminal 2: Background Worker (required for emails)
yarn workspace api dev:worker

# Terminal 3: Web Dashboard
yarn workspace web dev
```

## Development Commands

### Environment Setup

- **Start services**: `yarn services:up` - Starts PostgreSQL, Redis, MinIO via Docker Compose
- **Stop services**: `yarn services:down` - Stops all infrastructure services

### Development

- **Start all apps**: `yarn dev` - Starts all apps including API server and worker process
- **Start specific app**: `yarn dev --filter="<app-name>"` (e.g., `yarn dev --filter="web"`)
- **Start API only (server)**: `yarn workspace api dev:server` - API server without worker
- **Start API only (worker)**: `yarn workspace api dev:worker` - Worker process only
- **Build all**: `yarn build`
- **Lint all**: `yarn lint`
- **Clean all**: `yarn clean` - Removes node_modules, .turbo, and build artifacts

### Database (Prisma)

- **Generate client**: `yarn workspace @plunk/db db:generate`
- **Run migrations (dev)**: `yarn workspace @plunk/db migrate:dev`

## Code Standards

### Import Organization

ESLint enforces import order: builtin → external → internal → parent → sibling with alphabetical sorting and newlines
between groups.

### TypeScript

- Use TypeScript for all new code
- Prefer type imports: `import type { ... }`
- Enable strict type checking

### Component Structure

- UI components go in `packages/ui/src/components/`
- App-specific components in `apps/<app>/src/components/`
- Follow atomic design pattern where applicable

## Making Changes

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** following the code standards above
3. **Test your changes** thoroughly
4. **Commit your changes** with clear, descriptive commit messages
5. **Push to your fork** and submit a pull request

## Pull Request Guidelines

- Provide a clear description of the changes
- Reference any related issues
- Ensure all tests pass and linting is clean
- Keep PRs focused on a single feature or fix

## Need Help?

- Check the [documentation](https://docs.useplunk.com)
- Open an issue for bugs or feature requests
- Join our community discussions

## License

By contributing to Plunk, you agree that your contributions will be licensed under the AGPL-3.0 License.

This repository is a modified version of [Plunk](https://github.com/useplunk/plunk) ([useplunk.com](https://www.useplunk.com/)). See [NOTICE](NOTICE) for copyright attribution details.
