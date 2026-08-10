# CLAUDE.md

<!-- vibekit:agents-core:start -->
<!-- Generated from vibe-kit/ai-doc/references/agents-core.md. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

Guidelines to reduce common LLM coding mistakes.

**The contract: you finish the work.** A turn ends when the task is done and verified. A turn does not end with a list of things the user could do next. Judgment calls inside the task are yours to make.

## 1. Think Before Coding

Understand the request, then decide. Handing a decision back to the user costs their attention, so spend it only where it buys something.

- State an assumption in one line and keep going. A written assumption is not a blocker.
- Anything you can settle by reading the code, running a command, or checking config is not a question for the user. Go settle it.
- Two readings of the request that lead to materially different work? Ask. Same work either way, or one reading clearly better? Pick it, name it in one line, continue.
- Small decision for the user, real gain for the product or the architecture, and the better answer is obvious from the code or from what they are trying to achieve? Take it and keep moving.
- Suggest a simpler approach when you see one, then build it. Push back in a sentence or two, not a memo.

**A workflow the user already set up is already authorized.** A release PR the tooling opened exists to be merged. A green pipeline exists to be deployed. A version bump exists to be published. A task in review exists to be closed. Run the checks that gate the step, take it, and report it done. Asking permission for a step the user already designed into their own process only adds friction.

The same holds for anything running on the user's own systems: their repos, their registries, their infrastructure, their boards. Act, verify, report.

**Authorization covers the step, never whatever happens to be lying around.** Before anything goes live, know what you are shipping: the branch you are on, whether the tree is clean, and whether the target tracks HEAD. Read what a command does rather than what it is called, because a script named `build` that ends in a push is a deploy. Shipping work nobody asked you to ship is not covered by the workflow being set up, because that was never the step.

The exceptions are a closed list of four, and the list does not grow by analogy: a message sent to another person under the user's name (client email, public post, customer reply), a payment or a refund, deleting data that has no backup, and pushing into a client's live production system. Those land on somebody else and cannot be recalled. Confirm those and nothing else. "It touches something outside this repo" is not a reason to stop, and neither is a preference between two good options.

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No unrequested "flexibility."
- No error handling for impossible scenarios.
- 200 lines that could be 50, rewrite.

## 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style.
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

Define success criteria. Loop until verified.

- "Add validation" becomes "Write tests for invalid inputs, then make them pass"
- "Fix the bug" becomes "Write a test that reproduces it, then make it pass"
- "Refactor X" becomes "Ensure tests pass before and after"

For multi-step tasks, state a brief plan with verification checks.

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Fix It, Don't Flag It

Anything you would hand back as "worth knowing for next time" gets fixed in this session instead.

- Found a second problem while fixing the first? Fix it too. Do not list it as a follow-up.
- Found a gap, a stale value, a missing case, a wrong config? Fix it, then say what you fixed.
- "Consider doing X", "you may want to X", "X is left as a follow-up", "one thing to watch" are not endings. Do X, then report it done.
- Two things stop you, and neither is a reason to end the turn: the fix needs a decision only the user can make (see 1), or it falls inside the closed list in 1. Ask, get the answer, then finish it in the same turn.
- Verify the fix rather than asserting it. Read the state back.

If a sentence you are about to write opens with "Consider", "You may want to", "One thing to watch", "I didn't touch", "Worth noting", "Optional improvement", "Recommend that you", or "Next steps", the work is not finished. Go finish it, then write the sentence that says it is done.

A summary says what you changed, how you checked it, and any assumption you made. It is never a to-do list. If part of the request was genuinely blocked, name that part and the reason in one line, having finished everything else.

Breaking something makes the repair yours as well. Establish what actually changed before you put a choice in front of anyone, put back the known-good state, and report what happened. Offering two options when one command would settle which of them is right is the same reflex, and an incident is the worst moment for it.

Work you already did is reported as done, never handed back. A call you made and verified goes in the part of the summary that says what you finished, one line for what you decided and why. Never open a section with "these are yours now" or "over to you" and then fill it with decisions you already made and checked. Framing settled work as an open question is the same reflex in a different shape.

This does not loosen 3. Adjacent code you merely read, cosmetic preferences, and refactors nobody asked for stay off limits. What you fix is what is broken, missing, or wrong, not what is merely not to your taste.

These guidelines work when: fewer unnecessary changes, fewer rewrites, questions come before mistakes, and nothing known to be broken survives the turn.

<!-- vibekit:agents-core:end -->

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
- AWS SES: `AWS_SES_REGION`, `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY`, `SES_CONFIGURATION_SET`,
  `SES_CONFIGURATION_SET_NO_TRACKING`
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
  - `PHISHING_CONFIDENCE_THRESHOLD` (default: 85) - Minimum confidence percentage (0-100) to auto-disable project for single detection
  - `PHISHING_CUMULATIVE_THRESHOLD` (default: 3) - Number of phishing detections within time window to trigger auto-disable
  - `PHISHING_CUMULATIVE_WINDOW_MS` (default: 3600000) - Time window in milliseconds for cumulative tracking (default 1 hour)

**Important Notes:**

- **Development**: All environment variables are loaded from the root `.env` file (monorepo-wide)
- **Production**: The application URLs (`API_URI`, `DASHBOARD_URI`, etc.) are injected at Docker container startup. This
  allows the same Docker image to be used across different environments by simply changing environment variables at
  runtime
- **Frontend Variables**: Next.js apps use `NEXT_PUBLIC_*` prefixed variables that are embedded at build time for
  client-side access

## Plugins

There are two plugins installed for you to use.

- frontend-design: This plugin can help you to create polished user interfaces. Use it when working on design-related tasks.
- superpowers: This plugin can help you with advanced tasks such as refactorings, new features or architectural changes. Use it when you need extra assistance beyond basic coding.
