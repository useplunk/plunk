import {beforeEach, describe, expect, it, vi} from 'vitest';

import {SecurityService, snsTopicAccountId} from '../SecurityService';
import {getAwsAccountId} from '../SESService';

vi.mock('../SESService', () => ({
  getAwsAccountId: vi.fn(),
}));

/**
 * An SNS message is only trusted when its topic is in the AWS account Plunk sends from. The
 * signature alone proves AWS delivered it, not that it came from this installation's topic.
 */
describe('SecurityService - SNS topic origin', () => {
  beforeEach(() => {
    vi.mocked(getAwsAccountId).mockReset().mockResolvedValue('111111111111');
  });

  describe('snsTopicAccountId', () => {
    it.each([
      ['arn:aws:sns:eu-north-1:111111111111:plunk-ses-events', '111111111111'],
      ['arn:aws-cn:sns:cn-north-1:222222222222:events', '222222222222'],
      ['arn:aws:sns:us-east-1:333333333333:events.fifo', '333333333333'],
    ])('reads the account from %s', (arn, account) => {
      expect(snsTopicAccountId(arn)).toBe(account);
    });

    it.each([
      undefined,
      null,
      42,
      '',
      'plunk-ses-events',
      'arn:aws:sqs:eu-north-1:111111111111:queue',
      'arn:aws:sns:eu-north-1::plunk-ses-events',
      'arn:aws:sns:eu-north-1:111111111111',
      'urn:aws:sns:eu-north-1:111111111111:plunk-ses-events',
    ])('rejects %j as an SNS topic ARN', value => {
      expect(snsTopicAccountId(value)).toBeUndefined();
    });
  });

  describe('snsTopicOrigin', () => {
    it('trusts a topic in its own account', async () => {
      await expect(
        SecurityService.snsTopicOrigin('arn:aws:sns:eu-north-1:111111111111:plunk-ses-events'),
      ).resolves.toBe('own');
    });

    it('does not trust a topic in another account', async () => {
      await expect(
        SecurityService.snsTopicOrigin('arn:aws:sns:eu-north-1:999999999999:plunk-ses-events'),
      ).resolves.toBe('foreign');
    });

    it('does not trust an account id that only starts with its own', async () => {
      await expect(
        SecurityService.snsTopicOrigin('arn:aws:sns:eu-north-1:1111111111119:plunk-ses-events'),
      ).resolves.toBe('foreign');
    });

    it('does not trust a missing or malformed topic, and does not look up the account for it', async () => {
      await expect(SecurityService.snsTopicOrigin(undefined)).resolves.toBe('foreign');
      await expect(SecurityService.snsTopicOrigin('not-an-arn')).resolves.toBe('foreign');

      expect(getAwsAccountId).not.toHaveBeenCalled();
    });

    it('reports unknown when the account cannot be looked up', async () => {
      vi.mocked(getAwsAccountId).mockRejectedValue(new Error('STS unreachable'));

      await expect(
        SecurityService.snsTopicOrigin('arn:aws:sns:eu-north-1:111111111111:plunk-ses-events'),
      ).resolves.toBe('unknown');
    });
  });
});
