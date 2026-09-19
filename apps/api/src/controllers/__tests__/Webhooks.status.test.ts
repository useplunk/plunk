import {EmailStatus} from '@plunk/db';
import {describe, expect, it} from 'vitest';
import {nextStatus} from '../Webhooks';

/**
 * SES publishes its events through SNS, which does not order them, so this handler sees an
 * arbitrary sequence. Before `nextStatus`, the last event to arrive won, and the ordinary
 * way a complaint happens -- open the mail, then report it -- reached the handler in the
 * harmful order often enough to leave one complaint in five reading OPENED with
 * `complainedAt` set.
 *
 * The campaign complaint and bounce lists select on `status`, so these cases are the thing
 * holding those lists level with the figures above them. See CampaignService.listRecipients.
 */
describe('nextStatus', () => {
  it('leaves a complaint alone when a stray open arrives afterwards', () => {
    expect(nextStatus(EmailStatus.COMPLAINED, EmailStatus.OPENED)).toBeUndefined();
    expect(nextStatus(EmailStatus.COMPLAINED, EmailStatus.CLICKED)).toBeUndefined();
    expect(nextStatus(EmailStatus.COMPLAINED, EmailStatus.DELIVERED)).toBeUndefined();
  });

  it('leaves a bounce alone when a stray open arrives afterwards', () => {
    expect(nextStatus(EmailStatus.BOUNCED, EmailStatus.OPENED)).toBeUndefined();
    expect(nextStatus(EmailStatus.BOUNCED, EmailStatus.DELIVERED)).toBeUndefined();
  });

  it('lets a complaint outrank a bounce, but not the other way round', () => {
    expect(nextStatus(EmailStatus.BOUNCED, EmailStatus.COMPLAINED)).toBe(EmailStatus.COMPLAINED);
    expect(nextStatus(EmailStatus.COMPLAINED, EmailStatus.BOUNCED)).toBeUndefined();
  });

  it('still advances a row through the ordinary engagement sequence', () => {
    expect(nextStatus(EmailStatus.SENT, EmailStatus.DELIVERED)).toBe(EmailStatus.DELIVERED);
    expect(nextStatus(EmailStatus.DELIVERED, EmailStatus.OPENED)).toBe(EmailStatus.OPENED);
    expect(nextStatus(EmailStatus.OPENED, EmailStatus.CLICKED)).toBe(EmailStatus.CLICKED);
    expect(nextStatus(EmailStatus.CLICKED, EmailStatus.BOUNCED)).toBe(EmailStatus.BOUNCED);
  });

  /**
   * A second open must still be written: `status` is unchanged, but the caller applies it
   * alongside the open counter, and returning undefined for an equal rank would be
   * indistinguishable from a downgrade at the call site.
   */
  it('accepts a repeat of the status already held', () => {
    expect(nextStatus(EmailStatus.OPENED, EmailStatus.OPENED)).toBe(EmailStatus.OPENED);
  });

  it('lets any real outcome supersede a row that has heard nothing back', () => {
    expect(nextStatus(EmailStatus.PENDING, EmailStatus.DELIVERED)).toBe(EmailStatus.DELIVERED);
    expect(nextStatus(EmailStatus.SENDING, EmailStatus.BOUNCED)).toBe(EmailStatus.BOUNCED);
    expect(nextStatus(EmailStatus.FAILED, EmailStatus.COMPLAINED)).toBe(EmailStatus.COMPLAINED);
  });

  it('changes nothing when the event carries no status', () => {
    expect(nextStatus(EmailStatus.OPENED, undefined)).toBeUndefined();
  });
});
