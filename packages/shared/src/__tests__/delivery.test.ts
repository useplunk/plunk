import {describe, expect, it} from 'vitest';

import {formatDuration, parseDuration} from '../delivery.js';
import {ActionSchemas, WorkflowThrottleSchemas} from '../schemas/index.js';

const base = {to: 'ana@acme.com', from: 'hello@acme.com', subject: 'Hi', body: '<p>Hi</p>'};
const template = '0b9f1a8e-3c1d-4a4e-9a51-2f6d1f8a7c10';

const parse = (delivery: unknown, extra: Record<string, unknown> = {}) =>
  ActionSchemas.send.safeParse({...base, ...extra, delivery});

const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

describe('parseDuration', () => {
  it.each([
    ['30m', 1800],
    ['24h', 86400],
    ['7d', 604800],
  ])('reads %s', (value, seconds) => {
    expect(parseDuration(value)).toBe(seconds);
  });

  it.each(['24', '0h', '1.5h', '24 h', '1w', 'h', '-1d'])('refuses %s', value => {
    expect(parseDuration(value)).toBeNull();
  });
});

/**
 * `delivery` comes out of parsing normalised, so the API never has to re-interpret it: a
 * Date or nothing for `at`, and one throttle shape whatever the caller wrote.
 */
describe('send schema - delivery', () => {
  it('leaves sends without delivery untouched', () => {
    const result = ActionSchemas.send.safeParse(base);
    expect(result.success && result.data.delivery).toBeUndefined();
  });

  describe('at', () => {
    it('becomes a Date when it is in the future', () => {
      const result = parse({at: inDays(1)});
      expect(result.success && result.data.delivery?.at).toBeInstanceOf(Date);
    });

    it('is dropped when it is not in the future, so the email goes out now', () => {
      const result = parse({at: inDays(-1)});
      expect(result.success).toBe(true);
      expect(result.success && result.data.delivery?.at).toBeUndefined();
    });

    it('accepts an offset other than Z', () => {
      expect(parse({at: inDays(2).replace('Z', '+00:00')}).success).toBe(true);
    });

    it.each([
      ['more than 30 days ahead', inDays(31)],
      ['without a timezone', '2026-11-01T09:00:00'],
      ['not a date', 'tomorrow at 9'],
    ])('is refused %s', (_case, at) => {
      expect(parse({at}).success).toBe(false);
    });
  });

  describe('throttle', () => {
    it('reads the shorthand as a per-recipient window', () => {
      const result = parse({throttle: '24h'}, {template, subject: undefined, body: undefined});
      expect(result.success && result.data.delivery?.throttle).toEqual({
        windowSeconds: 86400,
        key: undefined,
        scope: 'recipient',
      });
    });

    it('reads the object form, with no window meaning once ever', () => {
      const result = parse({throttle: {key: 'org_1', scope: 'project'}}, {template});
      expect(result.success && result.data.delivery?.throttle).toEqual({
        windowSeconds: null,
        key: 'org_1',
        scope: 'project',
      });
    });

    it('needs a key on a send without a template', () => {
      expect(parse({throttle: '24h'}).success).toBe(false);
      expect(parse({throttle: {window: '24h', key: 'usage-warning'}}).success).toBe(true);
    });

    it.each([
      ['a window under a minute', {window: '0m'}],
      ['a window over a year', {window: '366d'}],
      ['an unknown unit', {window: '1w'}],
      ['an unknown scope', {scope: 'contact'}],
      ['an unknown field', {windowSeconds: 60}],
    ])('refuses %s', (_case, throttle) => {
      expect(parse({throttle}, {template}).success).toBe(false);
    });
  });

  it('refuses unknown delivery fields', () => {
    expect(parse({sendAt: inDays(1)}).success).toBe(false);
  });
});

describe('formatDuration', () => {
  it('uses the largest whole unit', () => {
    expect(formatDuration(86400)).toBe('1d');
    expect(formatDuration(7200)).toBe('2h');
    expect(formatDuration(5400)).toBe('90m');
  });

  it('round-trips parseDuration', () => {
    for (const value of ['1m', '45m', '2h', '7d', '365d']) {
      expect(formatDuration(parseDuration(value)!)).toBe(value);
    }
  });
});

describe('workflow throttle', () => {
  const parseThrottle = (value: unknown) => WorkflowThrottleSchemas.throttle.safeParse(value);

  it('takes the same shorthand as delivery.throttle', () => {
    expect(parseThrottle('24h')).toEqual({success: true, data: {windowSeconds: 86400, key: null}});
  });

  it('takes a window and a field path', () => {
    expect(parseThrottle({window: '1h', key: 'event.orgId'}).data).toEqual({windowSeconds: 3600, key: 'event.orgId'});
    expect(parseThrottle({key: 'data.plan'}).data).toEqual({windowSeconds: null, key: 'data.plan'});
  });

  it('accepts null to turn it off', () => {
    expect(parseThrottle(null)).toEqual({success: true, data: null});
  });

  it('refuses a fixed value as the key, an empty object, scope and bad windows', () => {
    expect(parseThrottle({window: '24h', key: 'org_123'}).success).toBe(false);
    expect(parseThrottle({}).success).toBe(false);
    expect(parseThrottle({window: '24h', scope: 'project'}).success).toBe(false);
    expect(parseThrottle('30s').success).toBe(false);
    expect(parseThrottle('400d').success).toBe(false);
  });
});
