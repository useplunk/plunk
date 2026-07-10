/**
 * Machine-readable error codes for programmatic error handling
 * These codes allow API consumers to handle specific error types reliably
 */
export enum ErrorCode {
  // Authentication & Authorization (401-403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MISSING_AUTH = 'MISSING_AUTH',
  INVALID_API_KEY = 'INVALID_API_KEY',
  FORBIDDEN = 'FORBIDDEN',
  PROJECT_ACCESS_DENIED = 'PROJECT_ACCESS_DENIED',
  PROJECT_DISABLED = 'PROJECT_DISABLED',
  EMAIL_VERIFICATION_REQUIRED = 'EMAIL_VERIFICATION_REQUIRED',

  // Resource Errors (404-409)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONTACT_NOT_FOUND = 'CONTACT_NOT_FOUND',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  CAMPAIGN_NOT_FOUND = 'CAMPAIGN_NOT_FOUND',
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  IDEMPOTENCY_KEY_REUSED = 'IDEMPOTENCY_KEY_REUSED',

  // Validation & Input Errors (400, 422)
  BAD_REQUEST = 'BAD_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_REQUEST_BODY = 'INVALID_REQUEST_BODY',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Rate Limiting & Billing (429, 402)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BILLING_LIMIT_EXCEEDED = 'BILLING_LIMIT_EXCEEDED',
  UPGRADE_REQUIRED = 'UPGRADE_REQUIRED',

  // Server Errors (500+)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Structured field-level validation error
 */
export interface FieldError {
  field: string; // Dot-notation path (e.g., "email", "data.firstName")
  message: string; // Human-readable error message
  code: string; // Validation error code (e.g., "invalid_email", "too_short")
  received?: unknown; // The invalid value that was provided
}

/**
 * Base HTTP exception with support for error codes and structured data
 */
export class HttpException extends Error {
  public constructor(
    public readonly code: number,
    message: string,
    public readonly errorCode?: ErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Resource not found (404)
 */
export class NotFound extends HttpException {
  /**
   * Construct a new NotFound exception
   * @param resource The type of resource that was not found
   * @param id Optional resource identifier to include in the message
   */
  public constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID "${id}" was not found` : `That ${resource.toLowerCase()} was not found`;

    // Map common resources to specific error codes
    const errorCodeMap: Record<string, ErrorCode> = {
      contact: ErrorCode.CONTACT_NOT_FOUND,
      template: ErrorCode.TEMPLATE_NOT_FOUND,
      campaign: ErrorCode.CAMPAIGN_NOT_FOUND,
      workflow: ErrorCode.WORKFLOW_NOT_FOUND,
    };

    const errorCode = errorCodeMap[resource.toLowerCase()] || ErrorCode.RESOURCE_NOT_FOUND;

    super(404, message, errorCode, {resource, id});
  }
}

/**
 * Forbidden - user is not allowed to perform this action (403)
 */
export class NotAllowed extends HttpException {
  /**
   * Construct a new NotAllowed exception
   * @param msg Custom error message
   * @param reason Optional reason for the forbidden action
   */
  public constructor(msg = 'You are not allowed to perform this action', reason?: string) {
    super(403, msg, ErrorCode.FORBIDDEN, reason ? {reason} : undefined);
  }
}

/**
 * Unauthorized - user needs to authenticate (401)
 */
export class NotAuthenticated extends HttpException {
  public constructor(message = 'You need to be authenticated to do this', errorCode = ErrorCode.UNAUTHORIZED) {
    super(401, message, errorCode);
  }
}

/**
 * Payment required - user needs to upgrade plan (402)
 */
export class NeedToUpgrade extends HttpException {
  public constructor(msg = 'You need to upgrade your plan to do this') {
    super(402, msg, ErrorCode.UPGRADE_REQUIRED);
  }
}

/**
 * Validation error with field-level details (422)
 */
export class ValidationError extends HttpException {
  /**
   * Construct a new ValidationError exception
   * @param errors Array of field-level validation errors
   * @param message Optional override for the main error message
   */
  public constructor(
    public readonly errors: FieldError[],
    message = 'Validation failed',
  ) {
    super(422, message, ErrorCode.VALIDATION_ERROR, {errors});
  }
}

/**
 * Conflict - resource already exists or state conflict (409)
 */
export class ConflictError extends HttpException {
  public constructor(message: string, details?: Record<string, unknown>, errorCode = ErrorCode.CONFLICT) {
    super(409, message, errorCode, details);
  }
}

/**
 * Rate limit exceeded (429)
 */
export class RateLimitError extends HttpException {
  public constructor(message = 'Rate limit exceeded. Please try again later.', retryAfter?: number) {
    super(429, message, ErrorCode.RATE_LIMIT_EXCEEDED, retryAfter ? {retryAfter} : undefined);
  }
}

/**
 * Bad request - generic client error (400)
 */
export class BadRequest extends HttpException {
  public constructor(message: string, errorCode = ErrorCode.BAD_REQUEST, details?: Record<string, unknown>) {
    super(400, message, errorCode, details);
  }
}
