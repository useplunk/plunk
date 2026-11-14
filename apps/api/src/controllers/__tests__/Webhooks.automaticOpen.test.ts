import {describe, expect, it} from 'vitest';
import {isAutomaticOpen} from '../Webhooks';

/**
 * SES marks each Open with `isBotEvent`. Only an exact "Likely" leaves an open out: anything SES
 * does not mark that way counts, as every open did before the mark existed.
 */
describe('isAutomaticOpen', () => {
  it('leaves out an open SES marks as likely automated', () => {
    expect(isAutomaticOpen({isBotEvent: 'Likely'})).toBe(true);
  });

  it('counts an open SES marks as made by a person', () => {
    expect(isAutomaticOpen({isBotEvent: 'Unlikely'})).toBe(false);
  });

  it('counts an open without the mark, or with one it does not recognise', () => {
    expect(isAutomaticOpen(undefined)).toBe(false);
    expect(isAutomaticOpen(null)).toBe(false);
    expect(isAutomaticOpen({})).toBe(false);
    for (const isBotEvent of ['likely', 'Unknown', true, null]) {
      expect(isAutomaticOpen({isBotEvent})).toBe(false);
    }
  });
});
