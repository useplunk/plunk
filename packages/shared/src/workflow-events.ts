/**
 * Email events a workflow's own sends produce. A WAIT_FOR_EVENT step waiting for one of these can
 * count only the emails its execution sent (`scope: "execution"`). Other events cannot be traced
 * back to an execution, so the scope does not apply to them.
 */
const EXECUTION_SCOPED_EVENTS = new Set([
  'email.sent',
  'email.delivery',
  'email.open',
  'email.click',
  'email.bounce',
  'email.complaint',
]);

export function canScopeWaitToExecution(eventName: string): boolean {
  return EXECUTION_SCOPED_EVENTS.has(eventName);
}
