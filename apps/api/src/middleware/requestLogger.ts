import type {NextFunction, Request, Response} from 'express';
import {prisma} from '../database/prisma.js';
import {logger} from '../utils/logger.js';

/**
 * Check if request logging is enabled via environment variable
 * Set REQUEST_LOGGING=false to disable database logging entirely
 */
const REQUEST_LOGGING_ENABLED = process.env.REQUEST_LOGGING !== 'false';

/**
 * Endpoints to exclude from database logging
 *
 * Guidelines for what to skip:
 * - Health checks and monitoring endpoints (called by load balancers every few seconds)
 * - User session/auth endpoints (called on every page load in the dashboard)
 * - Real-time polling endpoints (called repeatedly for live updates)
 * - Static asset requests (should be served by CDN anyway)
 * - Internal/admin-only endpoints that don't need audit trails
 *
 * What TO log (valuable for analytics/debugging):
 * - Public API endpoints (/v1/send, /v1/track) - track customer usage
 * - Resource CRUD operations (contacts, templates, campaigns) - audit trail
 * - Authentication attempts (login, signup) - security monitoring
 * - Payment/billing operations - compliance
 * - Failed requests (always logged regardless of endpoint)
 */
const SKIP_LOGGING_PATHS = [
  // Health/status checks (called by load balancers constantly)
  '/health',
  '/',

  // User session endpoints (called on every dashboard page load)
  '/users/@me',
  '/users/@me/projects',
  '/users/me',
  '/users/me/projects',

  // Project switching (called frequently when user switches projects)
  '/users/@me/projects/:id',

  // Real-time polling/stats endpoints
  '/queue/stats',

  // Feature flags/config (called on app initialization)
  '/config',
  '/config/features',
  '/oauth-config',

  // Field introspection (called when building forms/filters)
  '/contacts/fields',
  '/events/names',
];

/**
 * Path patterns to exclude (regex)
 * For more complex matching like "/assets/*" or "*.json"
 */
const SKIP_LOGGING_PATTERNS = [
  /^\/assets\//i, // Static assets
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i, // Static files
];

/**
 * Check if a request should be logged to the database
 */
function shouldLogRequest(req: Request): boolean {
  const path = logger.path(req);

  // Check exact path matches
  if (SKIP_LOGGING_PATHS.includes(path)) {
    return false;
  }

  // Check pattern matches
  if (SKIP_LOGGING_PATTERNS.some(pattern => pattern.test(path))) {
    return false;
  }

  // Log everything else
  return true;
}

/**
 * Middleware to log API requests to the database for historical tracking and analytics
 * This runs asynchronously and does not block the response
 *
 * IMPORTANT: Only logs important endpoints to avoid noise and reduce database load
 *
 * Configuration:
 * - Set REQUEST_LOGGING=false to disable entirely
 * - Modify SKIP_LOGGING_PATHS to exclude specific endpoints
 * - Modify SKIP_LOGGING_PATTERNS to exclude path patterns
 */
export const databaseRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Check if logging is enabled
  if (!REQUEST_LOGGING_ENABLED) {
    return next();
  }

  // Skip logging for excluded endpoints
  if (!shouldLogRequest(req)) {
    return next();
  }

  const startTime = Date.now();

  // Capture the original res.json to log after response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    // Call original json method first
    const result = originalJson(body);

    // Log to database asynchronously (don't await, don't block response)
    void logRequestToDatabase(req, res, startTime, body);

    return result;
  };

  next();
};

/**
 * Log the request to the database
 * This runs asynchronously and failures are logged but don't affect the response
 */
async function logRequestToDatabase(
  req: Request,
  res: Response,
  startTime: number,
  responseBody: unknown,
): Promise<void> {
  try {
    const requestId = res.locals.requestId as string | undefined;
    const auth = res.locals.auth as {type?: string; userId?: string; projectId?: string} | undefined;

    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Extract error information if this is an error response
    let errorCode: string | undefined;
    let errorMessage: string | undefined;

    if (
      statusCode >= 400 &&
      responseBody &&
      typeof responseBody === 'object' &&
      'error' in responseBody &&
      responseBody.error &&
      typeof responseBody.error === 'object'
    ) {
      const error = responseBody.error as {code?: string; message?: string};
      errorCode = error.code;
      errorMessage = error.message;
    }

    // Calculate request/response sizes (approximate)
    const requestSize = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : undefined;
    const responseSize = JSON.stringify(responseBody).length;

    // Insert into database
    await prisma.apiRequest.create({
      data: {
        id: requestId || crypto.randomUUID(), // Use request ID as primary key
        method: req.method,
        // logger.path, not req.path: this runs from the res.json override, i.e.
        // inside the router, where req.path has been rewritten mount-relative.
        path: logger.path(req),
        statusCode,
        duration,
        projectId: auth?.projectId || null,
        userId: auth?.userId || null,
        authType: auth?.type || null,
        ip: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        errorCode: errorCode || null,
        errorMessage: errorMessage || null,
        requestSize: requestSize || null,
        responseSize,
      },
    });

    // Log success for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request logged to database', {requestId}, res);
    }
  } catch (error) {
    // Log the error but don't throw - we don't want logging failures to affect the API
    logger.error('Failed to log request to database', error, {
      path: logger.path(req),
      method: req.method,
    });
  }
}
