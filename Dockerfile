# Multi-stage Dockerfile for Plunk
# Creates a single image containing all applications (API, Worker, Web, Landing, Wiki)
# Use SERVICE environment variable to specify which service to run

# ============================================
# Stage 1: Dependencies (All dependencies for building)
# ============================================
# Use build platform (AMD64) to install dependencies, avoiding QEMU issues
FROM --platform=$BUILDPLATFORM node:20-slim AS deps
ARG TARGETPLATFORM
ARG BUILDPLATFORM
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Enable Corepack and set Yarn version
RUN corepack enable && corepack prepare yarn@4.9.1 --activate

# Copy Yarn configuration and release
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy package files for dependency installation
COPY package.json yarn.lock ./

# Copy workspace package.json files
# Every workspace listed in the root package.json must be present here, even if
# it is never built or run in the image: `yarn install --immutable` re-resolves
# the whole workspace graph and fails if a manifest is missing, because the
# lockfile it produces would differ from the committed one.
COPY apps/api/package.json ./apps/api/
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/smtp/package.json ./apps/smtp/
COPY apps/web/package.json ./apps/web/
COPY apps/landing/package.json ./apps/landing/
COPY apps/wiki/package.json ./apps/wiki/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/email/package.json ./packages/email/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Copy wiki source files for postinstall script (fumadocs-mdx)
COPY apps/wiki/content ./apps/wiki/content
COPY apps/wiki/lib ./apps/wiki/lib
COPY apps/wiki/source.config.ts ./apps/wiki/source.config.ts
COPY apps/wiki/mdx-components.tsx ./apps/wiki/mdx-components.tsx
COPY apps/wiki/next.config.mjs ./apps/wiki/next.config.mjs
COPY apps/wiki/tsconfig.json ./apps/wiki/tsconfig.json

# Install dependencies (runs on build platform, fetches binaries for target platform)
# Use cache mounts for Yarn cache to speed up dependency installation
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=locked \
    --mount=type=cache,target=/root/.cache/yarn,sharing=locked \
    echo "Building on $BUILDPLATFORM for $TARGETPLATFORM" && \
    yarn install --immutable

# ============================================
# Stage 1b: Production Dependencies for API/SMTP
# ============================================
# Install only production dependencies needed for API and SMTP services
FROM --platform=$BUILDPLATFORM node:20-slim AS prod-deps
ARG TARGETPLATFORM
ARG BUILDPLATFORM
WORKDIR /app

# Enable Corepack and set Yarn version
RUN corepack enable && corepack prepare yarn@4.9.1 --activate

# Copy Yarn configuration
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy all package.json files (needed for workspace resolution)
COPY package.json yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/smtp/package.json ./apps/smtp/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/email/package.json ./packages/email/

# Install ONLY production dependencies for api, smtp, and their workspace dependencies
# This excludes devDependencies and unneeded workspaces (web, landing, wiki, ui)
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=locked \
    --mount=type=cache,target=/root/.cache/yarn,sharing=locked \
    echo "Installing production dependencies for API/SMTP on $BUILDPLATFORM for $TARGETPLATFORM" && \
    yarn workspaces focus api smtp --production

# ============================================
# Stage 2: Builder
# ============================================
# Builder runs on target platform to generate platform-specific artifacts
FROM node:20-slim AS builder
ARG TARGETPLATFORM

# Build-time arguments for URL configuration
# These are only used during the build process (for wiki OpenAPI generation and static assets)
# Runtime URLs are configured via *_DOMAIN and USE_HTTPS environment variables at container startup
ARG API_URI=https://next-api.useplunk.com
ARG DASHBOARD_URI=https://next-app.useplunk.com
ARG LANDING_URI=https://www.useplunk.com
ARG WIKI_URI=https://docs.useplunk.com

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Enable Corepack and set Yarn version
RUN corepack enable && corepack prepare yarn@4.9.1 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.yarnrc.yml ./
COPY --from=deps /app/package.json ./
COPY --from=deps /app/yarn.lock ./

# ============================================
# OPTIMIZATION: Copy and build in layers for better Docker cache utilization
# Docker will only rebuild from the first changed layer, not everything
# ============================================

# Copy root config files needed for Turbo
COPY turbo.json ./

# Copy manifest generation script
COPY docker/generate-url-manifest.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/generate-url-manifest.sh

# Step 1: Copy and build shared packages (these change less frequently)
# Shared packages are dependencies for apps, so build them first.
# @plunk/mcp is excluded from the build below: it matches the "@plunk/*" filter
# by name but lives in apps/, so its source is not copied here — and it does not
# belong in the image anyway. It is an stdio server that users run via
# `npx @plunk/mcp` on their own machine, published to npm by npm-publish.yml.
COPY packages ./packages
RUN yarn workspace @plunk/db db:generate
RUN --mount=type=cache,target=/app/.turbo,sharing=locked \
    API_URI=${API_URI} \
    DASHBOARD_URI=${DASHBOARD_URI} \
    LANDING_URI=${LANDING_URI} \
    WIKI_URI=${WIKI_URI} \
    NEXT_PUBLIC_API_URI=${API_URI} \
    NEXT_PUBLIC_DASHBOARD_URI=${DASHBOARD_URI} \
    NEXT_PUBLIC_LANDING_URI=${LANDING_URI} \
    NEXT_PUBLIC_WIKI_URI=${WIKI_URI} \
    yarn turbo build --filter="@plunk/*" --filter="!@plunk/mcp"

# Step 2: Copy and build API (backend services)
COPY apps/api ./apps/api
COPY apps/smtp ./apps/smtp
RUN --mount=type=cache,target=/app/.turbo,sharing=locked \
    API_URI=${API_URI} \
    DASHBOARD_URI=${DASHBOARD_URI} \
    LANDING_URI=${LANDING_URI} \
    WIKI_URI=${WIKI_URI} \
    NEXT_PUBLIC_API_URI=${API_URI} \
    NEXT_PUBLIC_DASHBOARD_URI=${DASHBOARD_URI} \
    NEXT_PUBLIC_LANDING_URI=${LANDING_URI} \
    NEXT_PUBLIC_WIKI_URI=${WIKI_URI} \
    yarn turbo build --filter=api --filter=smtp

# Step 3: Copy and build Wiki (includes API doc generation)
COPY apps/wiki ./apps/wiki
# Generate OpenAPI spec and docs (URLs will be placeholder values for runtime replacement)
RUN cd apps/wiki && \
    node scripts/generate-openapi.js && \
    npx tsx scripts/generate-docs.mts && \
    npx fumadocs-mdx && \
    cd ../..
# Build wiki with placeholder URLs (replaced at container startup)
RUN --mount=type=cache,target=/app/.turbo,sharing=locked \
    API_URI=${API_URI} \
    DASHBOARD_URI=${DASHBOARD_URI} \
    LANDING_URI=${LANDING_URI} \
    WIKI_URI=${WIKI_URI} \
    NEXT_PUBLIC_API_URI=${API_URI} \
    NEXT_PUBLIC_DASHBOARD_URI=${DASHBOARD_URI} \
    NEXT_PUBLIC_LANDING_URI=${LANDING_URI} \
    NEXT_PUBLIC_WIKI_URI=${WIKI_URI} \
    yarn turbo build --filter=wiki
# Generate sitemap for wiki
RUN NEXT_PUBLIC_WIKI_URI=${WIKI_URI} yarn workspace wiki sitemap
# Generate URL replacement manifest for wiki (build-time optimization)
RUN generate-url-manifest.sh wiki /app/apps/wiki

# Step 4: Copy and build Web dashboard
COPY apps/web ./apps/web
RUN --mount=type=cache,target=/app/.turbo,sharing=locked \
    API_URI=${API_URI} \
    DASHBOARD_URI=${DASHBOARD_URI} \
    LANDING_URI=${LANDING_URI} \
    WIKI_URI=${WIKI_URI} \
    NEXT_PUBLIC_API_URI=${API_URI} \
    NEXT_PUBLIC_DASHBOARD_URI=${DASHBOARD_URI} \
    NEXT_PUBLIC_LANDING_URI=${LANDING_URI} \
    NEXT_PUBLIC_WIKI_URI=${WIKI_URI} \
    yarn turbo build --filter=web
# Generate sitemap for web
RUN NEXT_PUBLIC_DASHBOARD_URI=${DASHBOARD_URI} yarn workspace web sitemap
# Generate URL replacement manifest for web (build-time optimization)
RUN generate-url-manifest.sh web /app/apps/web

# Step 5: Copy and build Landing page
COPY apps/landing ./apps/landing
RUN --mount=type=cache,target=/app/.turbo,sharing=locked \
    API_URI=${API_URI} \
    DASHBOARD_URI=${DASHBOARD_URI} \
    LANDING_URI=${LANDING_URI} \
    WIKI_URI=${WIKI_URI} \
    NEXT_PUBLIC_API_URI=${API_URI} \
    NEXT_PUBLIC_DASHBOARD_URI=${DASHBOARD_URI} \
    NEXT_PUBLIC_LANDING_URI=${LANDING_URI} \
    NEXT_PUBLIC_WIKI_URI=${WIKI_URI} \
    yarn turbo build --filter=landing
# Generate sitemap for landing
RUN NEXT_PUBLIC_LANDING_URI=${LANDING_URI} yarn workspace landing sitemap
# Generate URL replacement manifest for landing (build-time optimization)
RUN generate-url-manifest.sh landing /app/apps/landing

# Copy any remaining root files (if needed)
COPY . .

# Ensure directories exist (create empty ones if build didn't generate them)
RUN mkdir -p \
    apps/web/public \
    apps/landing/public \
    apps/wiki/public \
    apps/web/.next/standalone \
    apps/landing/.next/standalone \
    apps/wiki/.next/standalone

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner
ARG TARGETPLATFORM
ARG BUILDPLATFORM
WORKDIR /app

# Install OpenSSL for Prisma, curl for health checks, nginx, and gettext (for envsubst)
RUN apk add --no-cache openssl curl nginx gettext

# Install PM2 globally for process management
# Use cache mount and specific version to prevent hangs
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pm2@5.4.2 --prefer-offline --no-audit

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 plunk

# Create nginx directories and set permissions
RUN mkdir -p /var/log/nginx /var/lib/nginx /run/nginx && \
    chown -R plunk:nodejs /var/log/nginx /var/lib/nginx /run/nginx /etc/nginx

# ============================================
# Copy API and SMTP services with minimal dependencies
# ============================================

# Copy built API and SMTP services
COPY --from=builder --chown=plunk:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=plunk:nodejs /app/apps/smtp/dist ./apps/smtp/dist

# Copy ONLY production dependencies for API/SMTP (excludes dev deps and frontend packages)
COPY --from=prod-deps --chown=plunk:nodejs /app/node_modules ./node_modules

# Copy Prisma client from builder (includes generated client with correct platform binaries)
COPY --from=builder --chown=plunk:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=plunk:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy only the shared packages that are built (not source files)
# These are needed by API/SMTP at runtime
COPY --from=builder --chown=plunk:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=plunk:nodejs /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=plunk:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=plunk:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=plunk:nodejs /app/packages/email/dist ./packages/email/dist
COPY --from=builder --chown=plunk:nodejs /app/packages/email/package.json ./packages/email/package.json
COPY --from=builder --chown=plunk:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=plunk:nodejs /app/packages/types/package.json ./packages/types/package.json

# Copy Prisma schema (needed for migrations at runtime)
COPY --from=builder --chown=plunk:nodejs /app/packages/db/prisma ./packages/db/prisma

# Copy root package.json and workspace config (needed for yarn workspace commands in entrypoint)
COPY --from=builder --chown=plunk:nodejs /app/package.json ./
COPY --from=prod-deps --chown=plunk:nodejs /app/.yarnrc.yml ./
COPY --from=prod-deps --chown=plunk:nodejs /app/.yarn ./.yarn
COPY --from=prod-deps --chown=plunk:nodejs /app/yarn.lock ./

# Copy API/SMTP package.json files
COPY --from=builder --chown=plunk:nodejs /app/apps/api/package.json ./apps/api/
COPY --from=builder --chown=plunk:nodejs /app/apps/smtp/package.json ./apps/smtp/

# ============================================
# Copy Next.js apps with their standalone builds
# ============================================
# Next.js standalone mode bundles all dependencies internally, so we don't need
# to copy node_modules for these apps - they're completely self-contained

# Web app - standalone build with static assets
COPY --from=builder --chown=plunk:nodejs /app/apps/web/.next/standalone ./apps/web/.next/standalone
COPY --from=builder --chown=plunk:nodejs /app/apps/web/public ./apps/web/.next/standalone/apps/web/public
COPY --from=builder --chown=plunk:nodejs /app/apps/web/.next/static ./apps/web/.next/standalone/apps/web/.next/static
# Copy URL replacement manifests to standalone directory
COPY --from=builder --chown=plunk:nodejs /app/apps/web/.next/url-manifest.txt ./apps/web/.next/standalone/apps/web/.next/url-manifest.txt
COPY --from=builder --chown=plunk:nodejs /app/apps/web/.next/sitemap-manifest.txt ./apps/web/.next/standalone/apps/web/.next/sitemap-manifest.txt

# Landing app - standalone build with static assets
COPY --from=builder --chown=plunk:nodejs /app/apps/landing/.next/standalone ./apps/landing/.next/standalone
COPY --from=builder --chown=plunk:nodejs /app/apps/landing/public ./apps/landing/.next/standalone/apps/landing/public
COPY --from=builder --chown=plunk:nodejs /app/apps/landing/.next/static ./apps/landing/.next/standalone/apps/landing/.next/static
# Copy URL replacement manifests to standalone directory
COPY --from=builder --chown=plunk:nodejs /app/apps/landing/.next/url-manifest.txt ./apps/landing/.next/standalone/apps/landing/.next/url-manifest.txt
COPY --from=builder --chown=plunk:nodejs /app/apps/landing/.next/sitemap-manifest.txt ./apps/landing/.next/standalone/apps/landing/.next/sitemap-manifest.txt

# Wiki app - standalone build with static assets and OpenAPI spec
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/.next/standalone ./apps/wiki/.next/standalone
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/public ./apps/wiki/.next/standalone/apps/wiki/public
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/.next/static ./apps/wiki/.next/standalone/apps/wiki/.next/static
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/openapi.local.json ./apps/wiki/.next/standalone/apps/wiki/openapi.local.json
# Copy URL replacement manifests to standalone directory
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/.next/url-manifest.txt ./apps/wiki/.next/standalone/apps/wiki/.next/url-manifest.txt
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/.next/sitemap-manifest.txt ./apps/wiki/.next/standalone/apps/wiki/.next/sitemap-manifest.txt

# Copy full .next directories for the entrypoint script (URL replacement via find command)
# These are much smaller than node_modules and needed for runtime URL replacement
COPY --from=builder --chown=plunk:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder --chown=plunk:nodejs /app/apps/landing/.next ./apps/landing/.next
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/.next ./apps/wiki/.next
COPY --from=builder --chown=plunk:nodejs /app/apps/wiki/openapi.local.json ./apps/wiki/openapi.local.json

# ============================================
# Copy runtime configuration
# ============================================

# Copy nginx configuration templates and setup script
COPY --chown=plunk:nodejs docker/nginx/ /app/docker/nginx/
RUN chmod +x /app/docker/nginx/setup-nginx.sh

# Copy optimized URL replacement script
COPY --chown=plunk:nodejs docker/replace-urls-optimized.sh /app/docker/
RUN chmod +x /app/docker/replace-urls-optimized.sh

# Copy entrypoint script
COPY --chown=plunk:nodejs docker-entrypoint-nginx.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint-nginx.sh

USER plunk

# Expose nginx port (default 80), SMTP ports (465, 587)
# Port 80 is also used for ACME HTTP-01 challenges
EXPOSE 80 465 587

# Health check through nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Default to running all services via entrypoint
ENV SERVICE=all

ENTRYPOINT ["docker-entrypoint-nginx.sh"]
