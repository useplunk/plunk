/**
 * Transactional email types: the send response and the email resource
 */

/**
 * What happened to one recipient of POST /v1/send
 * - queued: accepted and on its way now
 * - scheduled: accepted with `delivery.at`, sent at `scheduledFor`
 * - throttled: held back by `delivery.throttle`; no email was created and nothing was billed
 */
export type SendEmailStatus = 'queued' | 'scheduled' | 'throttled';

/** One recipient's result in the POST /v1/send response */
export interface SendEmailResult {
  contact: {id: string; email: string};
  /** The email's id, or null when throttled */
  email: string | null;
  status: SendEmailStatus;
  /** When a scheduled email will be sent (ISO 8601) */
  scheduledFor?: string;
  /** When a throttled notification may be sent again (ISO 8601); null when it never may */
  nextAllowedAt?: string | null;
}

/** `delivery.throttle` as the API uses it after parsing */
export interface ThrottleOptions {
  /** Window length in seconds; null holds the notification forever ("once ever") */
  windowSeconds: number | null;
  /** Narrows the notification beyond its template, e.g. an organisation id */
  key?: string;
  /** Whom the notification is held for: each recipient, or the whole project */
  scope: 'recipient' | 'project';
}

/** GET /emails/:id */
export interface EmailResource {
  id: string;
  status: string;
  sourceType: string;
  subject: string;
  contact: {id: string; email: string};
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
}
