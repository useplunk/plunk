# Getting Started

This guide walks you from a fresh clone to a running local dev environment and your first pull request.

For architecture details and code standards, see [CONTRIBUTING.md](./CONTRIBUTING.md) and [CLAUDE.md](./CLAUDE.md).

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | CI uses Node 20 |
| Yarn | 4.9+ | Enforced via `packageManager` in `package.json` |
| Docker | Latest | Required for PostgreSQL, Redis, and MinIO |

Enable Yarn via Corepack:

```bash
corepack enable
corepack prepare yarn@4.9.1 --activate
```

## 1. Clone and install

```bash
git clone https://github.com/useplunk/plunk.git
cd plunk
yarn install
```

## 2. Start infrastructure services

Start PostgreSQL, Redis, and MinIO via Docker Compose:

```bash
yarn services:up
```

Stop services when done:

```bash
yarn services:down
```

**Note:** `yarn services:up` only starts infrastructure containers. It does **not** run database migrations.

### Service ports

| Service | Host port | Default credentials |
|---------|-----------|---------------------|
| PostgreSQL | `55432` | user `postgres`, password `postgres`, db `postgres` |
| Redis | `56379` | no auth |
| MinIO API | `9000` | user `plunk`, password `plunkminiopass` |
| MinIO Console | `9001` | same as above |

## 3. Environment setup

Environment variables are **per-package**. Each app/package ships its own `.env.example`. Copy them to `.env` before running migrations or dev servers.

```bash
cp apps/api/.env.example apps/api/.env
cp packages/db/.env.example packages/db/.env
cp apps/web/.env.example apps/web/.env
cp apps/landing/.env.example apps/landing/.env
cp apps/wiki/.env.example apps/wiki/.env
```

### Which `.env` file does what?

| File | Used by | Required for |
|------|---------|--------------|
| `packages/db/.env` | Prisma CLI (`migrate:dev`, `db:generate`) | Database migrations |
| `apps/api/.env` | API server and worker | Backend, queues, email, storage |
| `apps/web/.env` | Dashboard (Next.js) | `NEXT_PUBLIC_*` URLs |
| `apps/landing/.env` | Marketing site (Next.js) | `NEXT_PUBLIC_*` URLs |
| `apps/wiki/.env` | Docs site (Next.js) | `NEXT_PUBLIC_*` URLs and OpenAPI doc generation |

The default values in these templates already match the Docker Compose ports above. You can start developing without editing them.

### Optional integrations

These are **not required** to boot the dev stack, but enable specific features when configured in `apps/api/.env`:

- **AWS SES** — sending real emails
- **OAuth** (GitHub, Google) — social login
- **Stripe** — billing
- **OpenRouter** — phishing detection

Leave them blank for local UI and API work.

## 4. Database setup

Generate the Prisma client and apply migrations:

```bash
yarn workspace @plunk/db db:generate
yarn workspace @plunk/db migrate:dev
```

If you see `Environment variable not found: DIRECT_DATABASE_URL`, you are missing `packages/db/.env` — go back to step 3.

**Important:** `migrate:dev` (and `db:generate`) only run Prisma — they generate the client in `node_modules/@prisma/client`. They do **not** compile `@plunk/db` TypeScript into `packages/db/dist/`. That compilation happens in step 5.

## 5. Build shared packages

The API, worker, and SMTP app import workspace packages from their compiled `dist/` output (for example `@plunk/db/dist/index.js`, `@plunk/shared/dist/index.js`, and `@plunk/email/dist/index.js`). Those files do not exist until you build.

Build all packages the API depends on **before** running the dev stack:

```bash
yarn build --filter="api..."
```

The `...` suffix tells Turborepo to build `api` and every workspace package it depends on (`@plunk/db`, `@plunk/types`, `@plunk/shared`, `@plunk/email`, etc.).

If you hit import or type errors after pulling changes, rebuild explicitly:

```bash
yarn build --filter="@plunk/db" --filter="@plunk/types" --filter="@plunk/shared" --filter="@plunk/email"
```

**Do not skip this step.** Running `yarn dev` alone does not build shared packages — Turborepo's `dev` task has no `dependsOn: ["^build"]`. Building only `@plunk/shared` is not enough: the API also imports `@plunk/email`, which is not a dependency of `@plunk/shared`.

**For local dev, this is the only build you need.** You do not need to run `yarn build` (the full monorepo build) before `yarn dev`.

## 6. Run the dev stack

Start all apps (API server, worker, and frontends):

```bash
yarn dev
```

If you skip step 5, Next.js apps (web, landing, wiki) may start, but the API and worker will crash with `ERR_MODULE_NOT_FOUND` for packages such as `@plunk/db/dist/index.js`, `@plunk/shared/dist/index.js`, or `@plunk/email/dist/index.js`. SMTP may start once `@plunk/db` is built but the API will still fail without `@plunk/email`.

Or run components separately for debugging:

```bash
# Terminal 1 — API server
yarn workspace api dev:server

# Terminal 2 — Background worker (required for emails and jobs)
yarn workspace api dev:worker

# Terminal 3 — Dashboard
yarn workspace web dev

# Terminal 4 — Landing page
yarn workspace landing dev

# Terminal 5 — Wiki / docs
yarn workspace wiki dev
```

### Dev URLs

| App | URL | Port |
|-----|-----|------|
| API | http://localhost:8080 | 8080 |
| Dashboard (web) | http://localhost:3000 | 3000 |
| Landing | http://localhost:4000 | 4000 |
| Wiki | http://localhost:1000 | 1000 |
| MinIO Console | http://localhost:9001 | 9001 |

## 7. Verify everything works

1. Open http://localhost:3000 — dashboard should load.
2. Open http://localhost:8080 — API should respond (health/status endpoint).
3. Check terminal output for errors from the worker process.

If frontends load but API calls fail, confirm `NEXT_PUBLIC_API_URI` in the frontend `.env` files points to `http://localhost:8080`.

## 8. Testing and linting

There are no git pre-commit hooks. Run these manually before opening a PR:

```bash
# Lint all packages
yarn lint

# Run tests (requires Docker services or CI-equivalent env)
yarn test:run

# Build all apps (catches type errors)
yarn build
```

For a full monorepo build, the wiki requires a generated OpenAPI file first (see [Wiki build fails on `/openapi.json`](#wiki-build-fails-on-openapijson)). To build everything locally:

```bash
yarn workspace wiki generate-docs
yarn build
```

For watch mode during development:

```bash
yarn test:watch
```

## 9. Pull request workflow

### Branch from `next`

The active development branch is **`next`**, not `main`. CI runs on pushes and PRs targeting `next`.

```bash
git checkout next
git pull origin next
git checkout -b feat/my-feature
```

### Conventional commit PR titles

PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add email template editor
fix: resolve memory leak in worker
docs: update getting started guide
chore: bump dependencies
```

Breaking changes use `!`:

```
feat!: redesign API authentication
```

See [.github/pull_request_template.md](./.github/pull_request_template.md) for the full type list.

### Before submitting

- [ ] Branch is based on `next`
- [ ] PR title follows conventional commits format
- [ ] `yarn lint` passes
- [ ] `yarn test:run` passes
- [ ] `yarn build` succeeds (run `yarn workspace wiki generate-docs` first if the wiki build fails)
- [ ] Documentation updated if needed
- [ ] PR description explains the change and links related issues

### Open the PR

1. Push your branch to your fork.
2. Open a PR targeting **`next`**.
3. Fill in the PR template checklist.

## 10. Common commands reference

| Command | Description |
|---------|-------------|
| `yarn services:up` | Start PostgreSQL, Redis, MinIO |
| `yarn services:down` | Stop infrastructure services |
| `yarn dev` | Start all dev servers |
| `yarn build` | Build all packages and apps |
| `yarn lint` | Lint all packages |
| `yarn test:run` | Run test suite once |
| `yarn workspace @plunk/db migrate:dev` | Apply database migrations (dev) |
| `yarn workspace @plunk/db db:generate` | Regenerate Prisma client |
| `yarn build --filter="api..."` | Build API and all workspace dependencies (required before first `yarn dev`) |
| `yarn workspace wiki generate-docs` | Generate `openapi.local.json` and API docs for the wiki |
| `yarn clean` | Remove node_modules and build artifacts |

## 11. Troubleshooting

### `Environment variable not found: DIRECT_DATABASE_URL`

Prisma cannot find `packages/db/.env`. Copy the example file:

```bash
cp packages/db/.env.example packages/db/.env
```

### Port already in use

Another process is bound to a dev port. Either stop it or change the port in the relevant `.env` / app config.

Common conflicts: `3000` (web), `8080` (api), `55432` (postgres), `56379` (redis).

### `ERR_MODULE_NOT_FOUND` for `@plunk/db`, `@plunk/shared`, or `@plunk/email`

This usually means workspace packages were never built, or `dist/` was removed (for example after `yarn clean`).

Symptoms when running `yarn dev`:

- `api` and `api` worker fail immediately
- `smtp` may fail if `@plunk/db` is missing
- Frontends (web, landing, wiki) may still start

Fix — run step 5, then restart dev:

```bash
yarn build --filter="api..."
yarn dev
```

If that is not enough, rebuild the core packages explicitly:

```bash
yarn build --filter="@plunk/db" --filter="@plunk/types" --filter="@plunk/shared" --filter="@plunk/email"
```

**Note:** `yarn workspace @plunk/db migrate:dev` does not replace this step. Migrations update the database and regenerate the Prisma client; they do not compile workspace packages into `dist/`.

### Wiki build fails on `/openapi.json`

The wiki reads `apps/wiki/openapi.local.json` at build time. That file is gitignored and must be generated from `openapi.json` using your local API URL from `apps/wiki/.env`.

Symptoms when running `yarn build`:

```
Error: [OpenAPI] Failed to resolve input: ./openapi.local.json
Export encountered an error on /openapi.json/route: /openapi.json
```

Why this happens:

- The wiki defines a `prebuild` script that generates the file, but **Turborepo does not run Yarn `pre*` lifecycle hooks** — it invokes `next build` directly.
- `yarn dev` does not require a full wiki production build. The wiki dev server runs its `predev` hook via Yarn when started on its own, but a root-level `yarn build` will fail without the generated file.

Fix — generate docs, then rebuild:

```bash
yarn workspace wiki generate-docs
yarn build --filter=wiki
```

Or before a full monorepo build:

```bash
yarn workspace wiki generate-docs
yarn build
```

Ensure `apps/wiki/.env` exists (copy from `.env.example`) so the generator picks up `NEXT_PUBLIC_API_URI=http://localhost:8080`.

### API starts but emails/jobs don't process

The worker process must be running. Use `yarn dev` (starts both server and worker) or run `yarn workspace api dev:worker` in a separate terminal.

### Frontend can't reach the API

Check that `apps/web/.env` (and other frontends) have:

```
NEXT_PUBLIC_API_URI=http://localhost:8080
```

And that the API server is running on port 8080.

## Next steps

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for code standards and architecture overview.
- Browse the [documentation site](https://docs.useplunk.com) for API and self-hosting guides.
- Open an issue or discussion if you get stuck.
