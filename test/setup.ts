// IMPORTANT: this file runs before each test file's imports execute.
// We rewrite DATABASE_URL and REDIS_URL here so per-worker isolation is
// applied before any service module constructs a Prisma/Redis client.

import dotenv from 'dotenv';
import path from 'path';
import {afterAll, afterEach, beforeAll, vi} from 'vitest';

dotenv.config({path: path.resolve(__dirname, '../.env')});

// Vitest assigns each worker a 1-based pool id; defaults to "1" for single-worker runs.
const workerId = process.env.VITEST_POOL_ID || '1';

if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  const baseDb = url.pathname.replace(/^\//, '') || 'plunk_test';
  url.pathname = `/${baseDb}_w${workerId}`;
  process.env.DATABASE_URL = url.toString();
  // Mirror onto DIRECT_DATABASE_URL so prisma migrate uses the same worker DB.
  if (process.env.DIRECT_DATABASE_URL) {
    const direct = new URL(process.env.DIRECT_DATABASE_URL);
    direct.pathname = `/${baseDb}_w${workerId}`;
    process.env.DIRECT_DATABASE_URL = direct.toString();
  }
}

if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  url.pathname = `/${(parseInt(workerId, 10) - 1) % 16}`;
  process.env.REDIS_URL = url.toString();
}

process.env.NODE_ENV = 'test';

// constants.ts calls validateEnv() with no default for the SES credentials, so
// importing any module that transitively pulls in constants.ts throws when they
// are unset — which is exactly what `cp apps/api/.env.example .env` leaves you
// with, since those two ship empty. Tests never reach SES, so fill in placeholders
// rather than requiring every contributor to invent credentials.
//
// Only supply safe test placeholders for required values that may be absent.
// Database and Redis URLs must still point at real isolated test services.
const TEST_ENV_DEFAULTS: Record<string, string> = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  AWS_SES_ACCESS_KEY_ID: 'test-ses-access-key-id',
  AWS_SES_SECRET_ACCESS_KEY: 'test-ses-secret-access-key',
  SNS_TOPIC_ARNS:
    'arn:aws:sns:us-east-1:123456789012:plunk-ses-events,arn:aws:sns:eu-west-1:123456789012:plunk-ses-inbound',
};

for (const [key, value] of Object.entries(TEST_ENV_DEFAULTS)) {
  // Empty strings count as unset — validateEnv treats "" as missing.
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

// API rate limiting ships disabled so that upgrading Plunk never starts refusing a
// self-hoster's existing traffic. The suite has to exercise it regardless, so it is
// forced on here rather than defaulted above — otherwise the rate limit tests would
// assert against a middleware that returns immediately, and still pass.
process.env.RATE_LIMIT_ENABLED = 'true';

// Static import is safe: database.ts only reads env in initialize(), which runs
// in beforeAll — well after the env mutations above.
import {testDatabase} from './helpers/database';

beforeAll(async () => {
  await testDatabase.initialize();
});

afterEach(async () => {
  vi.clearAllMocks();
  vi.useRealTimers();
  await testDatabase.cleanup();
});

afterAll(async () => {
  await testDatabase.disconnect();
});
