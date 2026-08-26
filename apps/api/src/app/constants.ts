import dotenv from 'dotenv';
dotenv.config({quiet: true});

/**
 * Safely parse environment variables
 * @param key The key
 * @param defaultValue An optional default value if the environment variable does not exist
 */
export function validateEnv<T extends string = string>(key: keyof NodeJS.ProcessEnv, defaultValue?: T): T {
  const value = process.env[key] as T | undefined;

  if (!value) {
    if (typeof defaultValue !== 'undefined') {
      return defaultValue;
    } else {
      throw new Error(`${key} is not defined in environment variables`);
    }
  }

  return value;
}

// Environment
export const NODE_ENV = validateEnv('NODE_ENV', 'development');
export const JWT_SECRET = validateEnv('JWT_SECRET');
export const PORT = Number(validateEnv('PORT', '8080'));

// URLs
export const API_URI = validateEnv('API_URI');
export const DASHBOARD_URI = validateEnv('DASHBOARD_URI');
export const LANDING_URI = validateEnv('LANDING_URI');
export const WIKI_URI = validateEnv('WIKI_URI');

// S3-compatible storage (Minio)
export const S3_ENDPOINT = validateEnv('S3_ENDPOINT', 'http://minio:9000');
export const S3_ACCESS_KEY_ID = validateEnv('S3_ACCESS_KEY_ID', '');
export const S3_ACCESS_KEY_SECRET = validateEnv('S3_ACCESS_KEY_SECRET', '');
export const S3_BUCKET = validateEnv('S3_BUCKET', 'uploads');
export const S3_PUBLIC_URL = validateEnv('S3_PUBLIC_URL', '');
export const S3_FORCE_PATH_STYLE = validateEnv('S3_FORCE_PATH_STYLE', 'true') === 'true';
export const S3_ENABLED = S3_ACCESS_KEY_ID !== '' && S3_ACCESS_KEY_SECRET !== '';

// AWS SES (required for email sending)
export const AWS_SES_REGION = validateEnv('AWS_SES_REGION');
export const AWS_SES_ACCESS_KEY_ID = validateEnv('AWS_SES_ACCESS_KEY_ID');
export const AWS_SES_SECRET_ACCESS_KEY = validateEnv('AWS_SES_SECRET_ACCESS_KEY');

// Exact SNS topic ARNs authorized to deliver SES events to /webhooks/sns.
// Multiple topics support deployments that separate outbound and inbound SES.
const snsTopicArns = validateEnv('SNS_TOPIC_ARNS')
  .split(',')
  .map(topicArn => topicArn.trim())
  .filter(Boolean);

if (snsTopicArns.length === 0) {
  throw new Error('SNS_TOPIC_ARNS must contain at least one topic ARN');
}

export const SNS_TOPIC_ARNS: ReadonlySet<string> = new Set(snsTopicArns);

// Custom MAIL FROM subdomain used to construct `<subdomain>.<your-domain>`
// when a domain is added. Defaults to `plunk`. Override when `plunk.<your-domain>`
// is already used for something else (e.g. a CDN), since the MAIL FROM hostname
// needs MX + TXT records that can't coexist with a CNAME.
export const MAIL_FROM_SUBDOMAIN = validateEnv('MAIL_FROM_SUBDOMAIN', '').trim() || 'plunk';

// Email Processing Rate Limit (optional override)
// If not set, will automatically fetch from AWS SES account quota
// Set this to override AWS quota (useful for setting lower limits or testing)
export const EMAIL_RATE_LIMIT_PER_SECOND = process.env.EMAIL_RATE_LIMIT_PER_SECOND
  ? Number(process.env.EMAIL_RATE_LIMIT_PER_SECOND)
  : undefined;

// Email Worker Concurrency (optional override)
// If not set, concurrency is derived from the effective rate limit so a higher
// SES quota actually translates into higher throughput. Set this to pin a fixed
// value (useful when Prisma pool size or memory is the binding constraint).
export const EMAIL_WORKER_CONCURRENCY = process.env.EMAIL_WORKER_CONCURRENCY
  ? Number(process.env.EMAIL_WORKER_CONCURRENCY)
  : undefined;

// Upper bound for auto-derived concurrency. Raise this if you have a large SES
// quota AND have sized the Prisma connection pool accordingly.
export const EMAIL_WORKER_MAX_CONCURRENCY = process.env.EMAIL_WORKER_MAX_CONCURRENCY
  ? Number(process.env.EMAIL_WORKER_MAX_CONCURRENCY)
  : 50;

// Storage
export const REDIS_URL = validateEnv('REDIS_URL');
export const DATABASE_URL = validateEnv('DATABASE_URL');
export const DIRECT_DATABASE_URL = validateEnv('DIRECT_DATABASE_URL');

// OAuth (optional - for social login)
export const GITHUB_OAUTH_CLIENT = validateEnv('GITHUB_OAUTH_CLIENT', '');
export const GITHUB_OAUTH_SECRET = validateEnv('GITHUB_OAUTH_SECRET', '');
export const GITHUB_OAUTH_ENABLED = GITHUB_OAUTH_CLIENT !== '' && GITHUB_OAUTH_SECRET !== '';

export const GOOGLE_OAUTH_CLIENT = validateEnv('GOOGLE_OAUTH_CLIENT', '');
export const GOOGLE_OAUTH_SECRET = validateEnv('GOOGLE_OAUTH_SECRET', '');
export const GOOGLE_OAUTH_ENABLED = GOOGLE_OAUTH_CLIENT !== '' && GOOGLE_OAUTH_SECRET !== '';

// Stripe (optional - if not set, billing features are disabled)
export const STRIPE_SK = validateEnv('STRIPE_SK', '');
export const STRIPE_WEBHOOK_SECRET = validateEnv('STRIPE_WEBHOOK_SECRET', '');
export const STRIPE_ENABLED = STRIPE_SK !== '' && STRIPE_WEBHOOK_SECRET !== '';

// Stripe Pricing Configuration
export const STRIPE_PRICE_ONBOARDING = validateEnv('STRIPE_PRICE_ONBOARDING', ''); // One-time onboarding fee
export const STRIPE_PRICE_EMAIL_USAGE = validateEnv('STRIPE_PRICE_EMAIL_USAGE', ''); // Metered usage price for pay-per-email
export const STRIPE_METER_EVENT_NAME = validateEnv('STRIPE_METER_EVENT_NAME', 'emails'); // Meter event name (API key in Stripe)

// Email Tracking
export const SES_CONFIGURATION_SET = validateEnv('SES_CONFIGURATION_SET', 'plunk-configuration-set');
export const SES_CONFIGURATION_SET_NO_TRACKING = validateEnv(
  'SES_CONFIGURATION_SET_NO_TRACKING',
  'plunk-configuration-set-no-tracking',
);
// Check if no-tracking configuration set was explicitly provided (not using default)
export const TRACKING_TOGGLE_ENABLED = process.env.SES_CONFIGURATION_SET_NO_TRACKING !== undefined;

// SMTP Server Configuration (optional)
// SMTP server can run with or without a domain (runs without TLS in dev mode)
// Check if we should enable SMTP features in the UI
export const SMTP_DOMAIN = validateEnv('SMTP_DOMAIN', 'localhost');
export const SMTP_PORT_SECURE = Number(validateEnv('PORT_SECURE', '465'));
export const SMTP_PORT_SUBMISSION = Number(validateEnv('PORT_SUBMISSION', '587'));
// Enable SMTP features only when explicitly enabled via env or when a non-default domain is configured
export const SMTP_ENABLED =
  process.env.SMTP_ENABLED === 'true' || (SMTP_DOMAIN !== 'localhost' && NODE_ENV !== 'development');

export const PLUNK_API_KEY = validateEnv('PLUNK_API_KEY', '');
export const PLUNK_FROM_ADDRESS = validateEnv('PLUNK_FROM_ADDRESS', '');
export const PLUNK_ENABLED = PLUNK_API_KEY !== '' && PLUNK_FROM_ADDRESS !== '';

// Security (optional)
// Controls whether projects are automatically disabled when bounce/complaint rate thresholds are exceeded
// Useful for self-hosters who want to manage project status manually
export const AUTO_PROJECT_DISABLE = validateEnv('AUTO_PROJECT_DISABLE', 'true') === 'true';

// Self-hosting Configuration (optional)
// Controls whether new user signups are allowed (default: false)
export const DISABLE_SIGNUPS = process.env.DISABLE_SIGNUPS === 'true';
// Controls whether email validation checks are performed on signup (default: false)
export const VERIFY_EMAIL_ON_SIGNUP = process.env.VERIFY_EMAIL_ON_SIGNUP === 'true';

// Attachment Limits (optional)
// Maximum total attachment size in MB (default: 10). AWS SES supports up to 40 MB.
export const MAX_ATTACHMENT_SIZE_MB = Number(validateEnv('MAX_ATTACHMENT_SIZE_MB', '10'));
// Maximum number of attachments per email (default: 10)
export const MAX_ATTACHMENTS_COUNT = Number(validateEnv('MAX_ATTACHMENTS_COUNT', '10'));

// Idempotency (optional)
// How long a used Idempotency-Key stays claimed before it can be reused (default: 24 hours)
export const IDEMPOTENCY_KEY_TTL_HOURS = Number(validateEnv('IDEMPOTENCY_KEY_TTL_HOURS', '24'));

// API Rate Limiting
// Per-project token buckets on the high-traffic endpoints. Each bucket has a
// sustained rate (tokens refilled per second) and a burst ceiling (how many
// requests can arrive at once before throttling starts). The rates below are set
// well above normal usage — they exist to cap abuse and runaway integrations, not
// to shape ordinary traffic.
//
// Opt-in: an existing deployment must never start refusing a caller's traffic
// because it pulled a new version. Set RATE_LIMIT_ENABLED=true to switch it on,
// then optionally set an individual *_PER_SECOND to 0 to disable just that bucket.
export const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED === 'true';

// POST /v1/track — highest volume: event ingestion from servers and browsers
export const RATE_LIMIT_TRACK_PER_SECOND = Number(validateEnv('RATE_LIMIT_TRACK_PER_SECOND', '100'));
export const RATE_LIMIT_TRACK_BURST = Number(validateEnv('RATE_LIMIT_TRACK_BURST', '200'));

// POST /v1/send — also bounded by the project's billing limit
export const RATE_LIMIT_SEND_PER_SECOND = Number(validateEnv('RATE_LIMIT_SEND_PER_SECOND', '20'));
export const RATE_LIMIT_SEND_BURST = Number(validateEnv('RATE_LIMIT_SEND_BURST', '50'));

// Contact writes (create/update/delete) — real-time sync from external systems
export const RATE_LIMIT_CONTACTS_PER_SECOND = Number(validateEnv('RATE_LIMIT_CONTACTS_PER_SECOND', '50'));
export const RATE_LIMIT_CONTACTS_BURST = Number(validateEnv('RATE_LIMIT_CONTACTS_BURST', '100'));

// Email Verification & Password Reset
export const TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
export const EMAIL_VERIFICATION_RATE_LIMIT = 3; // Max 3 emails per hour
export const PASSWORD_RESET_RATE_LIMIT = 3; // Max 3 emails per hour
export const EMAIL_VERIFICATION_RATE_WINDOW = 3600; // 1 hour in seconds

// Phishing Detection (optional)
// OpenRouter API integration for content safety checks
export const OPENROUTER_API_KEY = validateEnv('OPENROUTER_API_KEY', '');
export const OPENROUTER_MODEL = validateEnv('OPENROUTER_MODEL', 'anthropic/claude-3-haiku');
export const PHISHING_DETECTION_SAMPLE_RATE = Number(validateEnv('PHISHING_DETECTION_SAMPLE_RATE', '0.1')); // Default 10% of emails
export const PHISHING_DETECTION_ENABLED = OPENROUTER_API_KEY !== '';
export const PHISHING_CONFIDENCE_THRESHOLD = Number(validateEnv('PHISHING_CONFIDENCE_THRESHOLD', '95')); // Confidence % required to auto-disable project from a single detection
export const PHISHING_CUMULATIVE_THRESHOLD = Number(validateEnv('PHISHING_CUMULATIVE_THRESHOLD', '3')); // Number of phishing detections before auto-disable (default 3)
export const PHISHING_CUMULATIVE_WINDOW_MS = Number(validateEnv('PHISHING_CUMULATIVE_WINDOW_MS', '3600000')); // Time window for cumulative tracking in ms (default 1 hour)
