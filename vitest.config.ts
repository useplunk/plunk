import {defineConfig} from 'vitest/config';
import path from 'path';

const alias = {
  '@plunk/db': path.resolve(__dirname, './packages/db/src'),
  '@plunk/shared': path.resolve(__dirname, './packages/shared/src'),
  '@plunk/types': path.resolve(__dirname, './packages/types/src'),
  '@plunk/email': path.resolve(__dirname, './packages/email/src'),
};

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.config.ts',
        '**/*.config.js',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
    // Each fork is a worker with an isolated Postgres database and Redis db-number
    // (see test/setup.ts). That isolation is what lets us run files in parallel
    // without the cross-test interference we used to hit with a shared DB.
    pool: 'forks',
    // Cap at 4 to stay within Postgres' default max_connections=100 when each
    // worker uses connection_limit=20 (see test/helpers/database.ts). It also keeps
    // the Redis db-number in test/setup.ts below its wrap-around at 16.
    // Vitest 4 removed `poolOptions`; the cap is now the top-level `maxWorkers`.
    // The old form only logs a deprecation notice and is otherwise ignored, so it
    // does not fail the run — it just drops the cap and lets vitest fork per core.
    maxWorkers: 4,
    maxConcurrency: 5,
    // Exposes global.gc to the workers. The memory assertions in test/performance
    // read heapUsed, which counts garbage the collector has not reached yet — without
    // a forced collection the number is GC timing, not retained memory, and cannot
    // tell a bounded cache from an unbounded one.
    execArgv: ['--expose-gc'],

    // Two projects because the MCP server is the one workspace with no database.
    // test/setup.ts hard-requires DATABASE_URL and connects to Postgres in a global
    // beforeAll, so running the mcp tests under it fails before a single assertion
    // runs — which is exactly what broke the npm publish workflow, where no Postgres
    // service exists. Keeping mcp in its own project lets it be tested (and
    // published) without standing up the platform's services.
    projects: [
      {
        resolve: {alias},
        test: {
          name: 'plunk',
          globals: true,
          environment: 'node',
          setupFiles: ['./test/setup.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
          // Only include our test files, not dependency tests
          include: [
            'apps/**/__tests__/**/*.{test,spec}.{ts,tsx}',
            'packages/**/__tests__/**/*.{test,spec}.{ts,tsx}',
            'test/**/*.{test,spec}.{ts,tsx}',
          ],
          exclude: [
            'node_modules/**',
            '**/node_modules/**',
            'dist/**',
            '.next/**',
            '.turbo/**',
            // Owned by the `mcp` project below.
            'apps/mcp/**',
          ],
        },
      },
      {
        test: {
          name: 'mcp',
          globals: true,
          environment: 'node',
          testTimeout: 30000,
          hookTimeout: 30000,
          include: ['apps/mcp/**/__tests__/**/*.{test,spec}.ts'],
          exclude: ['node_modules/**', '**/node_modules/**', 'dist/**', '.turbo/**'],
        },
      },
    ],
  },
});
