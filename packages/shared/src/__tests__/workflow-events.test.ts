import {describe, expect, it} from 'vitest';

import {canScopeWaitToExecution} from '../workflow-events.js';

describe('canScopeWaitToExecution', () => {
  it.each(['email.sent', 'email.delivery', 'email.open', 'email.click', 'email.bounce', 'email.complaint'])(
    'accepts %s, which a workflow email produces',
    eventName => {
      expect(canScopeWaitToExecution(eventName)).toBe(true);
    },
  );

  it.each(['email.received', 'email.opened', 'contact.subscribed', 'order.shipped', ''])(
    'refuses %s, which cannot be traced back to an execution',
    eventName => {
      expect(canScopeWaitToExecution(eventName)).toBe(false);
    },
  );
});
