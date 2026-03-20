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

// Azure Blob Storage
export const AZURE_STORAGE_CONNECTION_STRING = validateEnv('AZURE_STORAGE_CONNECTION_STRING', '');
export const AZURE_STORAGE_CONTAINER = validateEnv('AZURE_STORAGE_CONTAINER', 'uploads');
export const AZURE_STORAGE_PUBLIC_URL = validateEnv('AZURE_STORAGE_PUBLIC_URL', '');
export const AZURE_STORAGE_ENABLED = AZURE_STORAGE_CONNECTION_STRING !== '';

// AWS SES (required for email sending)
export const AWS_SES_REGION = validateEnv('AWS_SES_REGION');
export const AWS_SES_ACCESS_KEY_ID = validateEnv('AWS_SES_ACCESS_KEY_ID');
export const AWS_SES_SECRET_ACCESS_KEY = validateEnv('AWS_SES_SECRET_ACCESS_KEY');

// Email Processing Rate Limit (optional override)
// If not set, will automatically fetch from AWS SES account quota
// Set this to override AWS quota (useful for setting lower limits or testing)
export const EMAIL_RATE_LIMIT_PER_SECOND = process.env.EMAIL_RATE_LIMIT_PER_SECOND
  ? Number(process.env.EMAIL_RATE_LIMIT_PER_SECOND)
  : undefined;

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

// Email Verification & Password Reset
export const TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
export const EMAIL_VERIFICATION_RATE_LIMIT = 3; // Max 3 emails per hour
export const PASSWORD_RESET_RATE_LIMIT = 3; // Max 3 emails per hour
export const EMAIL_VERIFICATION_RATE_WINDOW = 3600; // 1 hour in seconds
