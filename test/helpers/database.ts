import {PrismaClient} from '@plunk/db';
import {execSync} from 'child_process';

// Snake-cased table names from prisma schema (see @@map directives).
// Order doesn't matter — TRUNCATE with CASCADE handles FK dependencies in one statement.
const TRUNCATE_TABLES = [
  'idempotency_keys',
  'events',
  'workflow_step_executions',
  'emails',
  'workflow_executions',
  'workflow_transitions',
  'workflow_steps',
  'workflows',
  'campaigns',
  'templates',
  'segment_memberships',
  'segments',
  'contacts',
  'domains',
  'memberships',
  'projects',
  'users',
];

/**
 * Connects to the admin `postgres` database to ensure the worker's test DB exists.
 * Postgres has no `CREATE DATABASE IF NOT EXISTS`, so we check pg_database first.
 */
async function ensureDatabaseExists(databaseUrl: string, workerDbName: string) {
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = '/postgres';
  adminUrl.searchParams.delete('connection_limit');
  adminUrl.searchParams.delete('pool_timeout');

  const admin = new PrismaClient({datasources: {db: {url: adminUrl.toString()}}});
  try {
    const rows = await admin.$queryRawUnsafe<{exists: boolean}[]>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '${workerDbName}') AS exists`,
    );
    if (!rows[0]?.exists) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${workerDbName}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

/**
 * Test database helper
 * Manages test database isolation and cleanup
 */
class TestDatabase {
  private prisma: PrismaClient | null = null;

  async initialize() {
    // setup.ts has already rewritten DATABASE_URL to include the per-worker DB name
    // (e.g. plunk_test_w1, plunk_test_w2). We create that DB if missing, migrate it,
    // then open the long-lived client we use for tests.
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set for testing');
    }

    const url = new URL(databaseUrl);
    const workerDbName = url.pathname.replace(/^\//, '');
    if (!workerDbName) {
      throw new Error('DATABASE_URL must include a database name');
    }

    // Bump the pool above Prisma's default (~5 on CI). Test Postgres has
    // max_connections=100; with N workers we want N*20 ≤ 100 — fine up to 4 workers.
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '20');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20');
    }

    await ensureDatabaseExists(databaseUrl, workerDbName);

    // Run pending migrations against this worker's DB. `migrate deploy` is a no-op
    // when up-to-date and avoids the drift prompts that `migrate dev` does.
    try {
      execSync('yarn workspace @plunk/db migrate:prod', {
        env: {
          ...process.env,
          DATABASE_URL: url.toString(),
          DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL || url.toString(),
        },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const err = error as {stdout?: string; stderr?: string; message?: string};
      console.error('Migration failed for', workerDbName);
      if (err.stdout) console.error('stdout:', err.stdout);
      if (err.stderr) console.error('stderr:', err.stderr);
      if (!err.stdout && !err.stderr) console.error(err.message);
      throw error;
    }

    this.prisma = new PrismaClient({
      datasources: {db: {url: url.toString()}},
    });
    await this.prisma.$connect();
  }

  /**
   * Get Prisma client instance
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prisma;
  }

  /**
   * Wipe all per-test data with a single TRUNCATE ... CASCADE statement.
   * Roughly an order of magnitude faster than 14 sequential deleteMany calls
   * — TRUNCATE skips the row scan and only touches table headers.
   */
  async cleanup() {
    if (!this.prisma) return;

    const tables = TRUNCATE_TABLES.map(t => `"${t}"`).join(', ');
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
        return;
      } catch (error) {
        lastError = error as Error;
        const isDeadlock = error instanceof Error && error.message?.includes('deadlock detected');
        if (isDeadlock && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 50));
          continue;
        }
        break;
      }
    }

    console.error(`Error cleaning up database after ${maxRetries} attempts:`, lastError);
    throw lastError;
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }

  /**
   * Execute raw SQL (useful for advanced test setup)
   */
  async executeRaw(sql: string) {
    if (!this.prisma) {
      throw new Error('Database not initialized');
    }
    return this.prisma.$executeRawUnsafe(sql);
  }

  /**
   * Reset database sequences (useful for predictable IDs in tests)
   */
  async resetSequences() {
    if (!this.prisma) return;

    // Get all tables with sequences
    const tables = [
      'User',
      'Project',
      'Contact',
      'Campaign',
      'Email',
      'Workflow',
      'WorkflowExecution',
      'Template',
      'Segment',
    ];

    for (const table of tables) {
      try {
        await this.prisma.$executeRawUnsafe(`ALTER SEQUENCE "${table}_id_seq" RESTART WITH 1`);
      } catch (error) {
        // Sequence might not exist, ignore
      }
    }
  }
}

// Export singleton instance
export const testDatabase = new TestDatabase();

// Export helper to get Prisma client in tests
// Returns a Proxy that lazily initializes the database on first property access
export const getPrismaClient = (() => {
  let clientProxy: PrismaClient | null = null;

  return () => {
    if (!clientProxy) {
      clientProxy = new Proxy({} as PrismaClient, {
        get(target, prop) {
          const client = testDatabase.getClient();
          const value = client[prop as keyof PrismaClient];
          // Bind methods to the actual client
          return typeof value === 'function' ? value.bind(client) : value;
        },
      });
    }
    return clientProxy;
  };
})();
