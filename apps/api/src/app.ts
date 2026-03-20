import {Server} from '@overnightjs/core';
import cookies from 'cookie-parser';
import cors from 'cors';
import type {NextFunction, Request, Response} from 'express';
import {json, raw} from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import signale from 'signale';
import {ZodError} from 'zod';

import {
  DASHBOARD_URI,
  GITHUB_OAUTH_ENABLED,
  GOOGLE_OAUTH_ENABLED,
  LANDING_URI,
  NODE_ENV,
  PLUNK_ENABLED,
  PORT,
  AZURE_STORAGE_ENABLED,
  SMTP_ENABLED,
  TRACKING_TOGGLE_ENABLED,
  WIKI_URI,
} from './app/constants.js';
import {Actions} from './controllers/Actions.js';
import {Activity} from './controllers/Activity.js';
import {Analytics} from './controllers/Analytics.js';
import {Auth} from './controllers/Auth.js';
import {Campaigns} from './controllers/Campaigns.js';
import {Contacts} from './controllers/Contacts.js';
import {Domains} from './controllers/Domains.js';
import {Events} from './controllers/Events.js';
import {Oauth} from './controllers/Oauth/index.js';
import {Projects} from './controllers/Projects.js';
import {Segments} from './controllers/Segments.js';
import {Templates} from './controllers/Templates.js';
import {Uploads} from './controllers/Uploads.js';
import {Users} from './controllers/Users.js';
import {Webhooks} from './controllers/Webhooks.js';
import {Workflows} from './controllers/Workflows.js';
import {Config} from './controllers/Config.js';
import {prisma} from './database/prisma.js';
import {ErrorCode, type FieldError, HttpException, ValidationError} from './exceptions/index.js';
import {apiRequestCleanupQueue, domainVerificationQueue, segmentCountQueue} from './services/QueueService.js';
import * as AzureBlobService from './services/AzureBlobService.js';
import {requestIdMiddleware} from './middleware/requestId.js';
import {databaseRequestLogger} from './middleware/requestLogger.js';
import {logger, requestLogger} from './utils/logger.js';

const server = new (class extends Server {
  public constructor() {
    super();

    // Parse requests as json
    this.app.use(json({limit: '50mb'}));
    this.app.use(cookies());
    this.app.use(helmet());

    // Add request ID to all requests for tracking
    this.app.use(requestIdMiddleware);

    // Log all requests and responses with request ID (console/file logs)
    this.app.use(requestLogger);

    // Log all requests to database for historical tracking and analytics
    this.app.use(databaseRequestLogger);

    // Build allowed origins from environment variables
    const allowedOrigins =
      NODE_ENV === 'development'
        ? [/.*\.localhost:1000/, 'http://localhost:3000', 'http://localhost:4000']
        : [DASHBOARD_URI, LANDING_URI, WIKI_URI];

    // Public API endpoints that should allow all origins
    const publicApiPaths = ['/v1', '/v1/track', '/v1/send'];

    // Log CORS configuration on startup
    signale.info('CORS configuration', {
      environment: NODE_ENV,
      allowedOrigins: allowedOrigins.map(o => (o instanceof RegExp ? o.toString() : o)),
      publicApiPaths,
    });

    // Apply restrictive CORS to all routes EXCEPT public API endpoints
    this.app.use((req, res, next) => {
      // Check if this is a public API endpoint
      const isPublicApi = publicApiPaths.some(path => req.path === path || req.path.startsWith(path + '/'));

      if (isPublicApi) {
        // For public API endpoints, allow all origins
        res.set({
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        // Handle preflight
        if (req.method === 'OPTIONS') {
          return res.sendStatus(200);
        }
        return next();
      }

      // For other endpoints, apply restrictive CORS
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
          if (!origin) {
            return callback(null, true);
          }

          // Check if origin matches any allowed origin (string or regex)
          const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
              return allowed.test(origin);
            }
            return allowed === origin;
          });

          if (isAllowed) {
            callback(null, true);
          } else {
            // Log CORS rejection with helpful information
            signale.warn('CORS request rejected', {
              origin,
              allowedOrigins: allowedOrigins.map(o => (o instanceof RegExp ? o.toString() : o)),
              hint: 'If using HTTPS, ensure USE_HTTPS=true is set in your environment variables',
            });
            // Reject the CORS request by passing false (don't send CORS headers)
            callback(null, false);
          }
        },
        credentials: true,
      })(req, res, next);
    });

    this.app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'short'));

    this.addControllers([
      new Actions(),
      new Activity(),
      new Analytics(),
      new Auth(),
      new Campaigns(),
      new Oauth(),
      new Users(),
      new Contacts(),
      new Domains(),
      new Projects(),
      new Segments(),
      new Templates(),
      new Uploads(),
      new Webhooks(),
      new Workflows(),
      new Events(),
      new Config(),
    ]);

    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        time: Date.now(),
        environment: NODE_ENV,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      });
    });

    this.app.get('/', (_, res) => res.redirect(LANDING_URI));

    this.app.use('*', () => {
      throw new HttpException(404, 'Unknown route');
    });
  }
})();

/**
 * Standardized error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string; // Machine-readable error code (e.g., "VALIDATION_ERROR")
    message: string; // Human-readable error message
    statusCode: number; // HTTP status code
    requestId?: string; // Request ID for tracking
    errors?: FieldError[]; // Field-level validation errors
    details?: Record<string, unknown>; // Additional error context
    suggestion?: string; // Helpful suggestion for fixing the error
  };
  timestamp: string; // ISO timestamp
}

server.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  const requestId = res.locals.requestId as string | undefined;

  // Handle JSON parsing errors (from express.json() middleware)
  if (error instanceof SyntaxError && 'body' in error) {
    const statusCode = 400;

    logger.warn(
      'JSON parsing failed',
      {
        endpoint: `${req.method} ${req.path}`,
        contentType: req.get('content-type'),
      },
      res,
    );

    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid JSON in request body',
        statusCode,
        requestId,
        suggestion: 'Ensure your request body is valid JSON and Content-Type header is set to "application/json".',
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const fieldErrors: FieldError[] = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      received: err.code !== 'invalid_type' ? undefined : 'received' in err ? err.received : undefined,
    }));

    const statusCode = 422;

    // Create helpful suggestions based on common validation errors
    let suggestion = 'Please check the API documentation for the correct request format.';
    if (fieldErrors.some(e => e.code === 'invalid_type')) {
      suggestion =
        'One or more fields have incorrect types. Check that strings are quoted, numbers are unquoted, and booleans are true/false.';
    } else if (fieldErrors.some(e => e.message.includes('required'))) {
      suggestion = 'Required fields are missing. Ensure all required fields are included in your request.';
    }

    // Log validation errors with structured logging
    logger.warn(
      'Validation failed',
      {
        endpoint: `${req.method} ${req.path}`,
        fieldCount: fieldErrors.length,
        fields: fieldErrors.map(e => e.field),
      },
      res,
    );

    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        statusCode,
        requestId,
        errors: fieldErrors,
        suggestion,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  // Handle custom HTTP exceptions
  if (error instanceof HttpException) {
    const statusCode = error.code;
    const errorCode = error.errorCode || ErrorCode.INTERNAL_SERVER_ERROR;

    // Extract validation errors if this is a ValidationError
    const validationError = error instanceof ValidationError ? error : null;

    // Log based on severity with structured logging
    if (statusCode >= 500) {
      logger.error(
        error.message,
        error,
        {
          endpoint: `${req.method} ${req.path}`,
          errorCode,
          statusCode,
        },
        res,
      );
    } else if (statusCode >= 400) {
      logger.warn(
        error.message,
        {
          endpoint: `${req.method} ${req.path}`,
          errorCode,
          statusCode,
        },
        res,
      );
    }

    // Generate helpful suggestions based on error type
    let suggestion: string | undefined;
    switch (errorCode) {
      case ErrorCode.INVALID_API_KEY:
        suggestion = 'Verify your API key is correct and starts with "sk_" for secret keys or "pk_" for public keys.';
        break;
      case ErrorCode.MISSING_AUTH:
        suggestion = 'Include an Authorization header with format: "Authorization: Bearer YOUR_API_KEY"';
        break;
      case ErrorCode.FORBIDDEN:
        suggestion =
          'This action requires additional permissions. Check that you have access to this resource or contact support.';
        break;
      case ErrorCode.TEMPLATE_NOT_FOUND:
        suggestion =
          'Ensure the template ID is correct and belongs to your project. You can list available templates via the API.';
        break;
      case ErrorCode.VALIDATION_ERROR:
        suggestion = 'Check the "errors" array for specific field-level validation issues.';
        break;
      case ErrorCode.RATE_LIMIT_EXCEEDED:
        suggestion = 'You have exceeded the rate limit. Wait a moment before retrying, or upgrade your plan.';
        break;
      case ErrorCode.UPGRADE_REQUIRED:
        suggestion = 'This feature requires a higher plan. Visit your dashboard to upgrade.';
        break;
      case ErrorCode.PROJECT_DISABLED:
        suggestion = 'Your project has been disabled. Contact support for assistance.';
        break;
    }

    const response: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: error.message,
        statusCode,
        requestId,
        errors: validationError?.errors,
        details: error.details,
        suggestion,
      },
      timestamp: new Date().toISOString(),
    };

    return res.status(statusCode).json(response);
  }

  // Handle unexpected errors (not HttpException)
  const statusCode = 500;
  logger.error(
    'Unexpected error occurred',
    error,
    {
      endpoint: `${req.method} ${req.path}`,
    },
    res,
  );

  const response: ErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      statusCode,
      requestId,
      suggestion: 'This is an internal server error. Please contact support with the request ID if the issue persists.',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
});

// Global error handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  signale.error('Unhandled Promise Rejection:', reason);
  signale.error('Promise:', promise);
  // Don't exit the process - just log the error
});

process.on('uncaughtException', error => {
  signale.error('Uncaught Exception:', error);
  // Don't exit the process - just log the error
});

void prisma.$connect().then(async () => {
  server.app.listen(PORT, '0.0.0.0', () => signale.success('[HTTPS] Ready on', PORT));

  // Feature matrix
  const features = [
    {
      name: 'File uploads (Azure Blob)',
      enabled: AZURE_STORAGE_ENABLED,
      details: AZURE_STORAGE_ENABLED ? 'Azure Blob Storage enabled' : 'Azure Storage not configured',
    },
    {name: 'SMTP relay', enabled: SMTP_ENABLED, details: SMTP_ENABLED ? 'SMTP server enabled' : 'SMTP disabled'},
    {
      name: 'OAuth - GitHub',
      enabled: GITHUB_OAUTH_ENABLED,
      details: GITHUB_OAUTH_ENABLED ? 'GitHub login enabled' : 'GitHub OAuth not configured',
    },
    {
      name: 'OAuth - Google',
      enabled: GOOGLE_OAUTH_ENABLED,
      details: GOOGLE_OAUTH_ENABLED ? 'Google login enabled' : 'Google OAuth not configured',
    },
    {
      name: 'Tracking toggle',
      enabled: TRACKING_TOGGLE_ENABLED,
      details: TRACKING_TOGGLE_ENABLED
        ? 'Per-project tracking toggle enabled'
        : 'Always tracking or always no-tracking',
    },
    {
      name: 'Platform emails',
      enabled: PLUNK_ENABLED,
      details: PLUNK_ENABLED ? 'Platform email notifications enabled' : 'PLUNK_API_KEY not configured',
    },
  ];

  const rows = features.map(f => ({
    Feature: f.name,
    Enabled: f.enabled ? '✅' : '❌',
  }));

  console.table(rows);

  if (AZURE_STORAGE_ENABLED) {
    try {
      await AzureBlobService.initializeContainer();
    } catch (error) {
      signale.error('[AZURE-BLOB] Failed to initialize container:', error);
      signale.warn('[AZURE-BLOB] File uploads may not work properly');
    }
  }

  // Set up repeatable job for domain verification (BullMQ)
  // Run every 5 minutes to check domain verification status with AWS SES
  await domainVerificationQueue.add(
    'check-domain-verification',
    {},
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes
      },
      jobId: 'domain-verification-repeatable', // Fixed ID to prevent duplicates
    },
  );

  signale.info('[BACKGROUND-JOB] Domain verification scheduled (BullMQ repeatable job, runs every 5 minutes)');

  // Set up repeatable job for segment count updates (BullMQ)
  // Run every 5 minutes to compute membership changes and trigger events
  await segmentCountQueue.add(
    'update-segment-counts',
    {},
    {
      repeat: {
        pattern: '*/5 * * * *', // Every 5 minutes
      },
      jobId: 'segment-count-repeatable', // Fixed ID to prevent duplicates
    },
  );

  signale.info('[BACKGROUND-JOB] Segment count updater scheduled (BullMQ repeatable job, runs every 5 minutes)');

  // Set up repeatable job for API request log cleanup (BullMQ)
  // Run daily at 3 AM to clean up old request logs
  await apiRequestCleanupQueue.add(
    'cleanup-old-requests',
    {},
    {
      repeat: {
        pattern: '0 3 * * *', // Daily at 3 AM
      },
      jobId: 'api-request-cleanup-repeatable', // Fixed ID to prevent duplicates
    },
  );

  signale.info('[BACKGROUND-JOB] API request cleanup scheduled (BullMQ repeatable job, runs daily at 3 AM)');
});
