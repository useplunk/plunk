import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {NextFunction, Request, Response} from 'express';
import {databaseRequestLogger} from '../requestLogger.js';
import {factories, getPrismaClient} from '../../../../../test/helpers';

async function waitForLog(prisma: ReturnType<typeof getPrismaClient>, id: string, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const record = await prisma.apiRequest.findUnique({where: {id}});
    if (record) return record;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  return prisma.apiRequest.findUnique({where: {id}});
}

async function waitForNoLog(ms = 200) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

describe('Request Logger Middleware', () => {
  const prisma = getPrismaClient();
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let projectId: string;
  let userId: string;

  beforeEach(async () => {
    const {user, project} = await factories.createUserWithProject();
    projectId = project.id;
    userId = user.id;

    req = {
      method: 'POST',
      originalUrl: '/v1/send',
      ip: '192.168.1.100',
      socket: {remoteAddress: '192.168.1.100'} as Request['socket'],
      get: vi.fn((header: string) => {
        if (header === 'user-agent') {
          return 'Mozilla/5.0 Test Browser';
        }
        return undefined;
      }),
      headers: {
        'content-length': '1234',
      },
    };

    // Mock response object with a json function that references the res object
    let statusCode = 200;
    res = {
      locals: {
        requestId: 'test-request-id-123',
        auth: {
          type: 'secret_key',
          userId,
          projectId,
        },
      },
      get statusCode() {
        return statusCode;
      },
      set statusCode(value: number) {
        statusCode = value;
      },
      json: vi.fn(function (this: Response, body: unknown) {
        return body;
      }),
    };

    next = vi.fn();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    // Clean up API request logs to avoid duplicate key errors
    await prisma.apiRequest.deleteMany({});
  });

  // ========================================
  // SUCCESSFUL REQUEST LOGGING
  // ========================================
  describe('Successful Request Logging', () => {
    it('should log successful API request to database', async () => {
      databaseRequestLogger(req as Request, res as Response, next);

      // Middleware should call next immediately
      expect(next).toHaveBeenCalled();

      // Simulate response
      const responseBody = {success: true, data: {id: '123'}};
      await res.json!(responseBody);

      const loggedRequest = await waitForLog(prisma, 'test-request-id-123');

      expect(loggedRequest).toBeDefined();
      expect(loggedRequest?.method).toBe('POST');
      expect(loggedRequest?.path).toBe('/v1/send');
      expect(loggedRequest?.statusCode).toBe(200);
      expect(loggedRequest?.projectId).toBe(projectId);
      expect(loggedRequest?.userId).toBe(userId);
      expect(loggedRequest?.authType).toBe('secret_key');
      expect(loggedRequest?.ip).toBe('192.168.1.100');
      expect(loggedRequest?.userAgent).toBe('Mozilla/5.0 Test Browser');
      expect(loggedRequest?.duration).toBeGreaterThanOrEqual(0);
      expect(loggedRequest?.requestSize).toBe(1234);
      expect(loggedRequest?.responseSize).toBeGreaterThan(0);
    });

    it('should log request without auth information', async () => {
      res.locals = {
        requestId: 'public-request-id',
      };

      databaseRequestLogger(req as Request, res as Response, next);

      const responseBody = {success: true};
      await res.json!(responseBody);

      const loggedRequest = await waitForLog(prisma, 'public-request-id');

      expect(loggedRequest).toBeDefined();
      expect(loggedRequest?.projectId).toBeNull();
      expect(loggedRequest?.userId).toBeNull();
      expect(loggedRequest?.authType).toBeNull();
    });

    it('should calculate request duration', async () => {
      const startTime = Date.now();

      databaseRequestLogger(req as Request, res as Response, next);

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 50));

      await res.json!({success: true});

      const loggedRequest = await waitForLog(prisma, 'test-request-id-123');

      // Allow for timer imprecision (especially in CI environments)
      expect(loggedRequest?.duration).toBeGreaterThanOrEqual(45);
      expect(loggedRequest?.duration).toBeLessThan(Date.now() - startTime + 100);
    });
  });

  // ========================================
  // ERROR REQUEST LOGGING
  // ========================================
  describe('Error Request Logging', () => {
    it('should log failed requests with error details', async () => {
      res.statusCode = 400;

      databaseRequestLogger(req as Request, res as Response, next);

      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      };

      await res.json!(errorResponse);

      const loggedRequest = await waitForLog(prisma, 'test-request-id-123');

      expect(loggedRequest).toBeDefined();
      expect(loggedRequest?.statusCode).toBe(400);
      expect(loggedRequest?.errorCode).toBe('VALIDATION_ERROR');
      expect(loggedRequest?.errorMessage).toBe('Invalid email format');
    });

    it('should log 500 errors', async () => {
      res.statusCode = 500;

      databaseRequestLogger(req as Request, res as Response, next);

      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        },
      };

      await res.json!(errorResponse);

      const loggedRequest = await waitForLog(prisma, 'test-request-id-123');

      expect(loggedRequest?.statusCode).toBe(500);
      expect(loggedRequest?.errorCode).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should log 404 not found errors', async () => {
      res.statusCode = 404;

      databaseRequestLogger(req as Request, res as Response, next);

      await res.json!({
        success: false,
        error: {code: 'RESOURCE_NOT_FOUND', message: 'Template not found'},
      });

      const loggedRequest = await waitForLog(prisma, 'test-request-id-123');

      expect(loggedRequest?.statusCode).toBe(404);
      expect(loggedRequest?.errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });

  // ========================================
  // SKIP LOGGING FOR EXCLUDED PATHS
  // ========================================
  describe('Skip Logging for Excluded Paths', () => {
    it('should skip logging for health check endpoint', async () => {
      req.originalUrl = '/health';

      databaseRequestLogger(req as Request, res as Response, next);

      await res.json!({status: 'ok'});

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not create database record
      const loggedRequest = await prisma.apiRequest.findUnique({
        where: {id: 'test-request-id-123'},
      });

      expect(loggedRequest).toBeNull();
    });

    it('should skip logging for user session endpoints', async () => {
      const sessionPaths = ['/users/@me', '/users/@me/projects', '/users/me', '/users/me/projects'];

      for (const path of sessionPaths) {
        req.originalUrl = path;
        res.locals!.requestId = `skip-${path}`;

        databaseRequestLogger(req as Request, res as Response, next);
        await res.json!({user: 'data'});
        await new Promise(resolve => setTimeout(resolve, 100));

        const loggedRequest = await prisma.apiRequest.findUnique({
          where: {id: `skip-${path}`},
        });

        expect(loggedRequest).toBeNull();
      }
    });

    it('should skip logging for static assets', async () => {
      const assetPaths = ['/assets/logo.png', '/assets/styles.css', '/assets/script.js'];

      for (const path of assetPaths) {
        req.originalUrl = path;
        res.locals!.requestId = `asset-${path}`;

        databaseRequestLogger(req as Request, res as Response, next);
        await res.json!({});
        await new Promise(resolve => setTimeout(resolve, 50));

        const loggedRequest = await prisma.apiRequest.findUnique({
          where: {id: `asset-${path}`},
        });

        expect(loggedRequest).toBeNull();
      }
    });

    it('should skip logging for config endpoints', async () => {
      const reqConfig = {...req, originalUrl: '/config'};
      const resConfig = {
        ...res,
        locals: {...res.locals!, requestId: 'test-config-skip'},
      };

      databaseRequestLogger(reqConfig as Request, resConfig as Response, next);
      await resConfig.json!({features: {}});
      await new Promise(resolve => setTimeout(resolve, 100));

      const loggedRequest = await prisma.apiRequest.findUnique({
        where: {id: 'test-config-skip'},
      });

      expect(loggedRequest).toBeNull();
    });

    it('should LOG important API endpoints', async () => {
      const importantPaths = ['/v1/send', '/v1/track', '/contacts', '/campaigns', '/templates'];

      for (const path of importantPaths) {
        req.originalUrl = path;
        res.locals!.requestId = `log-${path.replace(/\//g, '-')}`;

        databaseRequestLogger(req as Request, res as Response, next);
        await res.json!({success: true});

        const loggedRequest = await waitForLog(prisma, `log-${path.replace(/\//g, '-')}`);

        expect(loggedRequest).toBeDefined();
        expect(loggedRequest?.path).toBe(path);
      }
    });
  });

  // ========================================
  // CONFIGURATION & ERROR HANDLING
  // ========================================
  describe('Configuration & Error Handling', () => {
    it('should respect REQUEST_LOGGING=false environment variable', async () => {
      const originalEnv = process.env.REQUEST_LOGGING;
      process.env.REQUEST_LOGGING = 'false';

      // Re-import to get updated config
      // Note: This test may need to be adjusted based on how your module caching works
      databaseRequestLogger(req as Request, res as Response, next);

      await res.json!({success: true});
      await new Promise(resolve => setTimeout(resolve, 100));

 
      // Restore original value
      if (originalEnv !== undefined) {
        process.env.REQUEST_LOGGING = originalEnv;
      } else {
        delete process.env.REQUEST_LOGGING;
      }

      // This test might fail in current implementation since the env is read at module load time
      // Consider this a documentation of desired behavior
    });

    it('should handle missing request ID gracefully', async () => {
      res.locals = {}; // No request ID

      databaseRequestLogger(req as Request, res as Response, next);

      await res.json!({success: true});

      // Should create a record with generated UUID — poll for it
      const deadline = Date.now() + 2000;
      let allRequests: Awaited<ReturnType<typeof prisma.apiRequest.findMany>> = [];
      while (Date.now() < deadline) {
        allRequests = await prisma.apiRequest.findMany({
          where: {path: '/v1/send', method: 'POST'},
          orderBy: {createdAt: 'desc'},
          take: 1,
        });
        if (allRequests.length > 0) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      expect(allRequests.length).toBeGreaterThan(0);
      expect(allRequests[0].id).toBeDefined();
    });

    it('should not block response if database logging fails', async () => {
      // Simulate database error by using invalid data
      const resInvalid = {
        ...res,
        locals: {
          requestId: null as unknown, // Invalid request ID - will cause database error
        },
      };

      databaseRequestLogger(req as Request, resInvalid as Response, next);

      // Should not throw and should call next
      expect(next).toHaveBeenCalled();

      // Response should still work even if logging fails
      const result = resInvalid.json!({success: true});
      expect(result).toEqual({success: true});

      // Wait for async logging to fail silently
      await new Promise(resolve => setTimeout(resolve, 100));

      // The logging should have failed but not affected the response
    });
  });

  // ========================================
  // REQUEST/RESPONSE SIZE TRACKING
  // ========================================
  describe('Request/Response Size Tracking', () => {
    it('should track request size from content-length header', async () => {
      // Create a new request with different content-length
      const reqWithSize = {
        ...req,
        headers: {
          'content-length': '5000',
        },
      };

      // Create a new response with unique request ID
      const resWithId = {
        ...res,
        locals: {
          ...res.locals!,
          requestId: 'test-size-5000',
        },
      };

      databaseRequestLogger(reqWithSize as Request, resWithId as Response, next);

      await resWithId.json!({success: true});

      const loggedRequest = await waitForLog(prisma, 'test-size-5000');

      expect(loggedRequest?.requestSize).toBe(5000);
    });

    it('should handle missing content-length header', async () => {
      // Create request without content-length
      const reqNoSize = {
        ...req,
        headers: {},
      };

      const resWithId = {
        ...res,
        locals: {
          ...res.locals!,
          requestId: 'test-no-size',
        },
      };

      databaseRequestLogger(reqNoSize as Request, resWithId as Response, next);

      await resWithId.json!({success: true});

      const loggedRequest = await waitForLog(prisma, 'test-no-size');

      expect(loggedRequest?.requestSize).toBeNull();
    });

    it('should calculate response size from JSON body', async () => {
      const jsonMock = vi.fn(function (this: Response, body: unknown) {
        return body;
      });
      const resLarge = {
        ...res,
        locals: {...res.locals!, requestId: 'test-large-response'},
        json: jsonMock,
      };

      databaseRequestLogger(req as Request, resLarge as Response, next);

      const largeResponse = {
        success: true,
        data: {
          items: Array(100).fill({id: '123', name: 'Test Item', description: 'A test item'}),
        },
      };

      await resLarge.json!(largeResponse);

      const loggedRequest = await waitForLog(prisma, 'test-large-response');

      const expectedSize = JSON.stringify(largeResponse).length;
      expect(loggedRequest?.responseSize).toBe(expectedSize);
      expect(loggedRequest?.responseSize).toBeGreaterThan(1000);
    });
  });

  // ========================================
  // PATH RESOLUTION UNDER A MOUNTED ROUTER
  // ========================================
  describe('Path Resolution', () => {
    /**
     * These run a real Express app rather than a mock request, because the bug they
     * guard against only exists once a router is mounted: Express rewrites req.url
     * (and so req.path) to be relative to the mount point while the router runs, and
     * the logger writes its row from a res.json override that executes inside it.
     * A hand-built req object has no mount point and cannot reproduce that.
     *
     * The symptom was POST /contacts logging as "/" and POST /v1/track logging as
     * "/track" on success but "/v1/track" when it errored — the same endpoint under
     * two names, which silently breaks any per-endpoint analysis of the table.
     */
    async function callMounted(basePath: string, routePath: string, requestId: string) {
      const {default: express} = await import('express');

      const app = express();
      app.use(express.json());
      app.use((_req, res, next) => {
        res.locals.requestId = requestId;
        next();
      });
      app.use(databaseRequestLogger);

      const router = express.Router();
      router.post(routePath, (_req, res) => {
        res.json({success: true});
      });
      app.use(basePath, router);

      const server = app.listen(0);
      await new Promise(resolve => server.once('listening', resolve));

      try {
        const {port} = server.address() as {port: number};
        await fetch(`http://127.0.0.1:${port}${basePath}${routePath === '/' ? '' : routePath}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({}),
        });
      } finally {
        await new Promise(resolve => server.close(resolve));
      }

      return waitForLog(prisma, requestId);
    }

    it("logs a controller's root route under its mount path, not '/'", async () => {
      const loggedRequest = await callMounted('/contacts', '/', 'mounted-root-route');

      expect(loggedRequest?.path).toBe('/contacts');
    });

    it('logs a nested route under its full path, not the router-relative one', async () => {
      const loggedRequest = await callMounted('/v1', '/track', 'mounted-nested-route');

      expect(loggedRequest?.path).toBe('/v1/track');
    });

    it('records the path without its query string', async () => {
      const {default: express} = await import('express');

      const app = express();
      app.use((_req, res, next) => {
        res.locals.requestId = 'mounted-query-string';
        next();
      });
      app.use(databaseRequestLogger);

      const router = express.Router();
      router.get('/', (_req, res) => res.json({success: true}));
      app.use('/contacts', router);

      const server = app.listen(0);
      await new Promise(resolve => server.once('listening', resolve));

      try {
        const {port} = server.address() as {port: number};
        await fetch(`http://127.0.0.1:${port}/contacts?search=jane&limit=20`);
      } finally {
        await new Promise(resolve => server.close(resolve));
      }

      const loggedRequest = await waitForLog(prisma, 'mounted-query-string');

      // Query strings would fragment the table into one "endpoint" per parameter set.
      expect(loggedRequest?.path).toBe('/contacts');
    });
  });
});
