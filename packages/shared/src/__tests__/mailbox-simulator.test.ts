import {describe, expect, it} from 'vitest';

import {isMailboxSimulatorAddress} from '../mailbox-simulator.js';

/**
 * The predicate behind the `Email.simulated` flag. What it decides is whether a bounce or
 * complaint counts against a project's security rates, so a false negative means a
 * rehearsed bounce can warn or disable a real project, and a false positive means a real
 * bounce is silently forgiven. The lookalike cases below are the ones that separate the
 * two.
 */
describe('isMailboxSimulatorAddress', () => {
  it('recognises the documented simulator mailboxes', () => {
    for (const mailbox of ['bounce', 'complaint', 'success', 'ooto', 'suppressionlist']) {
      expect(isMailboxSimulatorAddress(`${mailbox}@simulator.amazonses.com`)).toBe(true);
    }
  });

  it('recognises labelled addresses', () => {
    // The documented way to tell several simulated bounces apart.
    expect(isMailboxSimulatorAddress('bounce+test@simulator.amazonses.com')).toBe(true);
    expect(isMailboxSimulatorAddress('bounce+one+two@simulator.amazonses.com')).toBe(true);
  });

  it('ignores case and surrounding whitespace in the domain', () => {
    expect(isMailboxSimulatorAddress('Bounce@Simulator.AmazonSES.com')).toBe(true);
    expect(isMailboxSimulatorAddress('bounce@simulator.amazonses.com ')).toBe(true);
  });

  it('matches the exact domain only', () => {
    // A domain that merely ends in the same text is somebody's real mail server.
    expect(isMailboxSimulatorAddress('bounce@simulator.amazonses.com.example.org')).toBe(false);
    expect(isMailboxSimulatorAddress('bounce@eu.simulator.amazonses.com')).toBe(false);
    expect(isMailboxSimulatorAddress('bounce@notsimulator.amazonses.com')).toBe(false);
    // The domain in the local part, not the domain part.
    expect(isMailboxSimulatorAddress('simulator.amazonses.com@example.org')).toBe(false);
  });

  it('handles absent or malformed addresses', () => {
    expect(isMailboxSimulatorAddress(null)).toBe(false);
    expect(isMailboxSimulatorAddress(undefined)).toBe(false);
    expect(isMailboxSimulatorAddress('')).toBe(false);
    expect(isMailboxSimulatorAddress('simulator.amazonses.com')).toBe(false);
  });
});
