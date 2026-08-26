# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Plunk is a Turborepo monorepo containing multiple applications and shared packages for a platform service. The project
uses Yarn workspaces with Node.js 20+ requirement.

## Scale & Performance Requirements

**CRITICAL**: This service operates at high scale with a large amount of contacts being added every day. All code
changes must consider:

- **Database Performance**: Queries must be optimized for large datasets (1M+ rows). Avoid N+1 queries, use proper
  indexes, and prefer cursor-based pagination over offset-based.
- **Memory Efficiency**: Never load large datasets into memory. Always use streaming or batch processing with reasonable
  limits.
- **Asynchronous Operations**: Heavy computations (counts, aggregations, bulk updates) should be offloaded to background
  jobs via BullMQ, not executed synchronously in API requests.
- **Caching Strategy**: Frequently accessed computed values should be cached or stored as materialized data to avoid
  repeated expensive queries.
- **Query Optimization**: Be mindful of JSON field queries (Contact.data) - these require GIN indexes. Test query plans
  with EXPLAIN ANALYZE.
- **API Response Times**: Target < 200ms for read operations, < 500ms for write operations. Use timeouts and circuit
  breakers.

When implementing features that query or process contacts, segments, or campaigns:

1. Always consider performance with millions of contacts
2. Use pagination with reasonable defaults (20-100 items)
3. Implement background jobs for bulk operations
4. Add database indexes for new query patterns
5. Cache computed values that don't need real-time accuracy

## Development Commands

### Environment Setup

- **Start services**: `yarn services:up` - Starts PostgreSQL, Redis, Minio, and Browserless via Docker Compose
- **Build shared packages**: `yarn build --filter="@plunk/shared"` - Required before running apps

### Development

- **Start all apps**: `yarn dev` - Starts all apps including API server and worker process
- **Start specific app**: `yarn dev --filter="<app-name>"` (e.g., `yarn dev --filter="web"`)
- **Start API only (server)**: `yarn workspace api dev:server` - API server without worker
- **Start API only (worker)**: `yarn workspace api dev:worker` - Worker process only
- **Build all**: `yarn build`
- **Lint all**: `yarn lint`
- **Clean all**: `yarn clean` - Removes node_modules, .turbo, and build artifacts

**Note**: The API's `dev` script automatically runs both the server and worker process using `concurrently`. If you need
to run them separately (e.g., for debugging), use `dev:server` and `dev:worker` individually.

### Database (Prisma)

- **Generate client**: `yarn workspace @plunk/db db:generate`
- **Run migrations (dev)**: `yarn workspace @plunk/db migrate:dev`
- **Deploy migrations (prod)**: `yarn workspace @plunk/db migrate:prod`

## Architecture

### Applications (`apps/`)

- **api**: Express.js API server with TypeScript (ESM), uses @overnightjs/core
  - HTTP API endpoints for the platform
  - Background cron jobs (workflow processor, domain verification)
  - **Worker process** (separate): BullMQ worker for processing email, campaign, and workflow queues
- **web**: Next.js app (Pages Router) - Main platform (next-app.useplunk.com)
- **landing**: Next.js app (Pages Router) - Marketing site (www.useplunk.com)
- **wiki**: Next.js app - Documentation site (docs.useplunk.com)

### Background Job Architecture

The API uses BullMQ (backed by Redis) for asynchronous job processing:

- **API Server** creates jobs and adds them to queues (email, campaign, workflow)
- **Worker Process** (`apps/api/src/jobs/worker.ts`) consumes jobs from queues
- Jobs are processed with retry logic, rate limiting, and concurrency control
- Worker runs separately for scalability and fault isolation (can scale workers independently)

### Shared Packages (`packages/`)

- **@plunk/db**: Prisma schema and client
- **@plunk/ui**: ShadCN-based UI library with Radix UI + Tailwind
- **@plunk/shared**: Common utilities and business logic
- **@plunk/types**: TypeScript type definitions
- **@plunk/email**: React-email templates
- **@plunk/notifications**: Notification system

## Key Technologies

- **Frontend**: React 19, Next.js 15.3, Tailwind CSS, Framer Motion
- **Backend**: Express.js, Prisma, Redis (ioredis), Stripe
- **UI Library**: Radix UI primitives, ShadCN components
- **Authentication**: JWT with bcrypt

## Code Standards

### Import Organization

ESLint enforces import order: builtin → external → internal → parent → sibling with alphabetical sorting and newlines
between groups.

### TypeScript

- Consistent type imports preferred: `import type { ... }`
- Unused vars allowed with `_` prefix
- Strict type checking enabled across all packages
- Try to avoid inline types in favor of shared types in `@plunk/types`

### Component Structure

- UI components in `packages/ui/src/components/`
- App-specific components in `apps/<app>/src/components/`
- Atomic design pattern: atoms → molecules hierarchy

## Environment Variables

**Configuration File Setup:**

- **Development**: Copy `.env.example` to `.env` at the repository root and fill in your values
- **All apps** (API, web, landing, wiki) load environment variables from the root `.env` file
- **Production**: Environment variables are injected by Docker/orchestration systems (no .env file needed)

Required for builds and deployment (see turbo.json and .env.example):

**Build Time:**

- Database: `DATABASE_URL`, `DIRECT_DATABASE_URL` (for Prisma client generation)
- Standard: `NODE_ENV`

**Runtime:**

- Security: `JWT_SECRET`
- Database: `DATABASE_URL`, `DIRECT_DATABASE_URL`
- Infrastructure: `REDIS_URL`
- **Application URLs** (injected at runtime into Next.js apps): `API_URI`, `DASHBOARD_URI`, `LANDING_URI`, `WIKI_URI` (
  optional)
- S3-compatible Storage (Minio): `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_ACCESS_KEY_SECRET`, `S3_BUCKET`,
  `S3_PUBLIC_URL`, `S3_FORCE_PATH_STYLE`
- AWS SES: `AWS_SES_REGION`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, `SNS_TOPIC_ARNS`,
  `SES_CONFIGURATION_SET`, `SES_CONFIGURATION_SET_NO_TRACKING`
- OAuth (optional): `GITHUB_OAUTH_CLIENT`, `GITHUB_OAUTH_SECRET`, `GOOGLE_OAUTH_CLIENT`, `GOOGLE_OAUTH_SECRET`
- Stripe (optional): `STRIPE_SK`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ONBOARDING`, `STRIPE_PRICE_EMAIL_USAGE`,
  `STRIPE_METER_EVENT_NAME`
- Notifications (optional): `NTFY_URL` (ntfy.sh topic URL or self-hosted server for system notifications)
- Platform Email Notifications (optional): `PLUNK_API_KEY` (enables email notifications to users for critical events like
  project disabled, billing limits, etc. If not set, only ntfy notifications are sent)
- Self-hosting User Management (optional):
  - `DISABLE_SIGNUPS` (default: false) - When set to true, prevents new user signups via the API
  - `VERIFY_EMAIL_ON_SIGNUP` (default: false) - When set to true, validates emails on signup for disposable domains,
    plus-addressing, domain existence, and MX records
- Security (optional): `AUTO_PROJECT_DISABLE` (default: true) - Controls whether projects are automatically disabled when
  bounce/complaint rate thresholds are exceeded
- Attachment Limits (optional):
  - `MAX_ATTACHMENT_SIZE_MB` (default: 10) - Maximum total attachment size in megabytes per email. AWS SES supports up to 40 MB.
  - `MAX_ATTACHMENTS_COUNT` (default: 10) - Maximum number of attachments per email
- Phishing Detection (optional):
  - `OPENROUTER_API_KEY` - API key for OpenRouter (enables phishing detection)
  - `OPENROUTER_MODEL` (default: anthropic/claude-3-haiku) - LLM model to use for content analysis
  - `PHISHING_DETECTION_SAMPLE_RATE` (default: 0.1) - Percentage of emails to check (0.0-1.0, e.g., 0.1 = 10%)
  - `PHISHING_CONFIDENCE_THRESHOLD` (default: 95) - Minimum confidence percentage (0-100) to auto-disable project for single detection
  - `PHISHING_CUMULATIVE_THRESHOLD` (default: 3) - Number of phishing detections within time window to trigger auto-disable
  - `PHISHING_CUMULATIVE_WINDOW_MS` (default: 3600000) - Time window in milliseconds for cumulative tracking (default 1 hour)

**Important Notes:**

- **Development**: All environment variables are loaded from the root `.env` file (monorepo-wide)
- **Production**: The application URLs (`API_URI`, `DASHBOARD_URI`, etc.) are injected at Docker container startup. This
  allows the same Docker image to be used across different environments by simply changing environment variables at
  runtime
- **Frontend Variables**: Next.js apps use `NEXT_PUBLIC_*` prefixed variables that are embedded at build time for
  client-side access

## Environment Variable Changes

When you add, rename, remove, or change the default/behaviour of any environment variable, you MUST update all THREE of the following in the same change:

1. `apps/api/.env.example` — local development defaults
2. `.env.self-host.example` — self-hosting / production template
3. `apps/wiki/content/docs/self-hosting/environment-variables.mdx` — user-facing reference

Rules:

- If the variable already exists in any file, **modify** its line/row/description — do not duplicate or leave a stale entry.
- Keep section/category names consistent across all three files (e.g. "AWS SES", "Phishing Detection").
- For dev-only or self-host-only variables, still mention them in the wiki and note the scope; only skip the example file where the variable is genuinely never applicable.
- When in doubt about whether a variable belongs in `apps/api/.env.example` (development), include it commented out with a short note.

## Plugins

There are two plugins installed for you to use.

- frontend-design: This plugin can help you to create polished user interfaces. Use it when working on design-related tasks.
- superpowers: This plugin can help you with advanced tasks such as refactorings, new features or architectural changes. Use it when you need extra assistance beyond basic coding.
