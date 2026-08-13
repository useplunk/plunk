import type {NextFunction, Request, Response} from 'express';
import signale from 'signale';

/**
 * Extract request ID from Express response locals
 */
function getRequestId(res?: Response): string | undefined {
  return res?.locals?.requestId as string | undefined;
}

/**
 * Extract user/project context from Express response locals
 */
function getRequestContext(res?: Response): Record<string, unknown> {
  const auth = res?.locals?.auth as {type?: string; userId?: string; projectId?: string} | undefined;

  if (!auth) {
    return {};
  }

  return {
    authType: auth.type,
    userId: auth.userId,
    projectId: auth.projectId,
  };
}

/**
 * Enhanced logger with request ID and context support
 */
export const logger = {
  /**
   * Log an info message with request context
   */
  info(message: string, meta?: Record<string, unknown>, res?: Response) {
    const requestId = getRequestId(res);
    const context = getRequestContext(res);

    signale.info({
      prefix: requestId ? `[${requestId}]` : '',
      message,
      ...context,
      ...meta,
    });
  },

  /**
   * Log a warning with request context
   */
  warn(message: string, meta?: Record<string, unknown>, res?: Response) {
    const requestId = getRequestId(res);
    const context = getRequestContext(res);

    signale.warn({
      prefix: requestId ? `[${requestId}]` : '',
      message,
      ...context,
      ...meta,
    });
  },

  /**
   * Log an error with request context and stack trace
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>, res?: Response) {
    const requestId = getRequestId(res);
    const context = getRequestContext(res);

    const errorDetails = error instanceof Error ? {error: error.message, stack: error.stack} : {error};

    signale.error({
      prefix: requestId ? `[${requestId}]` : '',
      message,
      ...context,
      ...errorDetails,
      ...meta,
    });
  },

  /**
   * Log a success message with request context
   */
  success(message: string, meta?: Record<string, unknown>, res?: Response) {
    const requestId = getRequestId(res);
    const context = getRequestContext(res);

    signale.success({
      prefix: requestId ? `[${requestId}]` : '',
      message,
      ...context,
      ...meta,
    });
  },

  /**
   * Log debug information (only in development)
   */
  debug(message: string, meta?: Record<string, unknown>, res?: Response) {
    if (process.env.NODE_ENV === 'development') {
      const requestId = getRequestId(res);
      const context = getRequestContext(res);

      signale.debug({
        prefix: requestId ? `[${requestId}]` : '',
        message,
        ...context,
        ...meta,
      });
    }
  },

  /**
   * The request's full path, safe to read at any point in the lifecycle.
   *
   * `req.path` is derived from `req.url`, which Express rewrites to be relative to
   * the router's mount point for as long as that router is handling the request,
   * restoring it once the router unwinds. Anything that reads `req.path` lazily —
   * from a `res.json` override, a `finish` listener, a promise — therefore sees a
   * truncated path (`/track` instead of `/v1/track`, or bare `/` for a controller's
   * root route), while the app-level error handler sees the full one. That split
   * makes the same endpoint log under two different names depending on outcome.
   *
   * `req.originalUrl` is never rewritten, so it is correct whenever it is read.
   */
  path(req: Request): string {
    // split always yields at least one element; the fallback only satisfies
    // noUncheckedIndexedAccess.
    return req.originalUrl.split('?')[0] ?? req.originalUrl;
  },

  /**
   * Log an API request (called by middleware)
   */
  request(req: Request, res: Response) {
    const requestId = getRequestId(res);
    const context = getRequestContext(res);

    signale.info({
      prefix: requestId ? `[${requestId}]` : '',
      message: `${req.method} ${logger.path(req)}`,
      ...context,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  },

  /**
   * Log an API response (called by middleware)
   */
  response(req: Request, res: Response, statusCode: number, duration: number) {
    const requestId = getRequestId(res);
    const context = getRequestContext(res);

    const logFn = statusCode >= 500 ? signale.error : statusCode >= 400 ? signale.warn : signale.success;

    logFn({
      prefix: requestId ? `[${requestId}]` : '',
      message: `${req.method} ${logger.path(req)} → ${statusCode}`,
      ...context,
      statusCode,
      duration: `${duration}ms`,
    });
  },
};

/**
 * Express middleware to log all requests and responses
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log incoming request
  logger.request(req, res);

  // Capture the original res.json to log responses
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const duration = Date.now() - startTime;
    logger.response(req, res, res.statusCode, duration);
    return originalJson(body);
  };

  next();
};
