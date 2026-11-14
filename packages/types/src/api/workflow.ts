/**
 * Workflow entry throttle: `throttle` on a workflow, the same option as `delivery.throttle`
 * on POST /v1/send, applied to entering the workflow.
 */

/** A workflow's throttle as the API returns and accepts it */
export interface WorkflowThrottle {
  /** At most one entry per window, e.g. "24h"; null means once per key value */
  window: string | null;
  /** Field the window is counted separately for, e.g. "event.orgId"; null counts per contact */
  key: string | null;
}

/** Why a contact did not enter a workflow */
export type WorkflowEntryRefusal =
  | {reason: 'already-entered'}
  | {reason: 'in-progress'}
  | {reason: 'throttled'; nextAllowedAt: Date | null};

/** A workflow's throttle after the request is parsed */
export interface WorkflowThrottleOptions {
  /** Window length in seconds; null holds each key value forever */
  windowSeconds: number | null;
  /** Field path counted separately; null counts per contact */
  key: string | null;
}
