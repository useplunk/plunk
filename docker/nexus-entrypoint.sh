#!/bin/sh
set -e

# Slim entrypoint for Dockerfile.nexus (no wiki/docs)

# NEXUS's PostgreSQL sidecar only injects DATABASE_URL; the Prisma schema also needs a direct URL
export DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

echo "Running database migrations..."
/app/node_modules/.bin/prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma

# Single-host mode: everything is served from PUBLIC_URL (e.g. https://your-app.nexusai.run).
# Dashboard at /, API at /api. If API_DOMAIN is set instead, use the *_DOMAIN based setup.
# The Deploy button sets PUBLIC_URL to the deployment's own URL; without it (and without
# API_DOMAIN) there is no way to know the public address, so stop with a clear error.
if [ -z "$PUBLIC_URL" ] && [ -z "$API_DOMAIN" ]; then
  echo "PUBLIC_URL is not set. Set it to this deployment's URL, e.g. https://your-app.nexusai.run" >&2
  exit 1
fi
if [ -n "$PUBLIC_URL" ]; then
  PUBLIC_URL="${PUBLIC_URL%/}"
  export API_URI="${PUBLIC_URL}/api"
  export DASHBOARD_URI="$PUBLIC_URL"
  export LANDING_URI="$PUBLIC_URL"
  export WIKI_URI="$PUBLIC_URL"
  # The shared hostname is not ours alone, so never scope the auth cookie to its base domain
  export COOKIE_DOMAIN="${COOKIE_DOMAIN:-host}"
fi

# Configure nginx and derive *_URI defaults from *_DOMAIN / USE_HTTPS
. /app/docker/nginx/setup-nginx.sh
if [ -n "$PUBLIC_URL" ]; then
  envsubst '${NGINX_PORT}' < /app/docker/nginx/nginx.nexus.conf.template > /etc/nginx/conf.d/plunk.conf
fi
. /app/docker/replace-urls-optimized.sh

replace_urls_in_app "web" "/app/apps/web/.next/standalone/apps/web"
replace_urls_in_app "landing" "/app/apps/landing/.next/standalone/apps/landing"

cat > /tmp/ecosystem.config.js << PMEOF
const base = {
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  watch: false
};
const urls = {
  API_URI: '${API_URI}',
  DASHBOARD_URI: '${DASHBOARD_URI}',
  LANDING_URI: '${LANDING_URI}',
  WIKI_URI: '${WIKI_URI}'
};

module.exports = {
  apps: [
    { ...base, name: 'nginx', script: 'nginx', args: '-g "daemon off;"' },
    {
      ...base, name: 'api', script: '/app/apps/api/dist/app.js', cwd: '/app',
      env: { NODE_ENV: 'production', PORT: 8080, ...urls }
    },
    {
      ...base, name: 'worker', script: '/app/apps/api/dist/jobs/worker.js', cwd: '/app',
      env: { NODE_ENV: 'production', ...urls }
    },
    {
      ...base, name: 'smtp', script: '/app/apps/smtp/dist/server.js', cwd: '/app',
      env: {
        NODE_ENV: 'production',
        API_URI: '${API_URI}',
        SMTP_DOMAIN: '${SMTP_DOMAIN:-}',
        PORT_SECURE: '465',
        PORT_SUBMISSION: '587',
        MAX_RECIPIENTS: '${MAX_RECIPIENTS:-5}',
        CERT_PATH: '/certs',
        ACME_JSON_PATH: '/certs/acme.json'
      }
    },
    {
      ...base, name: 'web', script: 'apps/web/server.js', cwd: '/app/apps/web/.next/standalone',
      env: { NODE_ENV: 'production', PORT: 3000, HOSTNAME: '0.0.0.0', ...urls }
    },
    {
      ...base, name: 'landing', script: 'apps/landing/server.js', cwd: '/app/apps/landing/.next/standalone',
      env: { NODE_ENV: 'production', PORT: 4000, HOSTNAME: '0.0.0.0', ...urls, PLUNK_API_KEY: '${PLUNK_API_KEY:-}' }
    }
  ]
};
PMEOF

echo "Starting services..."
exec pm2-runtime start /tmp/ecosystem.config.js
