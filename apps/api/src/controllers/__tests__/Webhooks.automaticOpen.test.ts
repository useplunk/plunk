import {afterEach, describe, expect, it, vi} from 'vitest';
import {isAutomaticOpen} from '../Webhooks';

/**
 * SES marks each Open with `isBotEvent`. Only an exact "Likely" leaves an open out: anything SES
 * does not mark that way counts, as every open did before the mark existed.
 */
describe('isAutomaticOpen', () => {
  it('leaves out an open SES marks as likely automated', () => {
    expect(isAutomaticOpen({isBotEvent: 'Likely'}, true)).toBe(true);
  });

  it('counts an open SES marks as made by a person', () => {
    expect(isAutomaticOpen({isBotEvent: 'Unlikely'}, true)).toBe(false);
  });

  it('counts an open without the mark, or with one it does not recognise', () => {
    expect(isAutomaticOpen(undefined, true)).toBe(false);
    expect(isAutomaticOpen(null, true)).toBe(false);
    expect(isAutomaticOpen({}, true)).toBe(false);
    for (const isBotEvent of ['likely', 'Unknown', true, null]) {
      expect(isAutomaticOpen({isBotEvent}, true)).toBe(false);
    }
  });

  it('counts every open when ignoring automatic opens is turned off', () => {
    expect(isAutomaticOpen({isBotEvent: 'Likely'}, false)).toBe(false);
  });
});

/**
 * The setting is on unless it says otherwise: unset or empty keeps the default, and only the
 * exact value `true` keeps it on, as the documentation describes.
 */
describe('IGNORE_AUTOMATIC_OPENS', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ['true', true],
    ['', true],
    ['false', false],
    ['TRUE', false],
    ['1', false],
  ])('reads %j as %s', async (value, expected) => {
    vi.stubEnv('IGNORE_AUTOMATIC_OPENS', value);
    vi.resetModules();

    const {IGNORE_AUTOMATIC_OPENS} = await import('../../app/constants.js');

    expect(IGNORE_AUTOMATIC_OPENS).toBe(expected);
  });
});
