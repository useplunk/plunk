import {beforeEach, describe, expect, it, vi} from 'vitest';

const getCallerIdentity = vi.fn();

vi.mock('@aws-sdk/client-sts', () => ({
  STS: class {
    getCallerIdentity = getCallerIdentity;
  },
}));

/**
 * The account id is looked up once through STS and cached, since every SNS message is checked
 * against it. A failed lookup must not be cached, or one network blip would reject every SES
 * event until the API restarts.
 */
describe('SESService - getAwsAccountId', () => {
  // The cache lives in the module, so each test loads a fresh copy
  async function load() {
    vi.resetModules();
    return (await import('../SESService')).getAwsAccountId;
  }

  beforeEach(() => {
    getCallerIdentity.mockReset();
  });

  it('looks the account up once and caches it', async () => {
    getCallerIdentity.mockResolvedValue({Account: '111111111111'});
    const getAwsAccountId = await load();

    await expect(getAwsAccountId()).resolves.toBe('111111111111');
    await expect(getAwsAccountId()).resolves.toBe('111111111111');

    expect(getCallerIdentity).toHaveBeenCalledOnce();
  });

  it('shares one lookup between concurrent callers', async () => {
    getCallerIdentity.mockResolvedValue({Account: '111111111111'});
    const getAwsAccountId = await load();

    await Promise.all([getAwsAccountId(), getAwsAccountId(), getAwsAccountId()]);

    expect(getCallerIdentity).toHaveBeenCalledOnce();
  });

  it('tries again after a failed lookup', async () => {
    getCallerIdentity.mockRejectedValueOnce(new Error('STS unreachable')).mockResolvedValue({Account: '111111111111'});
    const getAwsAccountId = await load();

    await expect(getAwsAccountId()).rejects.toThrow('STS unreachable');
    await expect(getAwsAccountId()).resolves.toBe('111111111111');

    expect(getCallerIdentity).toHaveBeenCalledTimes(2);
  });

  it('treats a response without an account as a failed lookup', async () => {
    getCallerIdentity.mockResolvedValueOnce({}).mockResolvedValue({Account: '111111111111'});
    const getAwsAccountId = await load();

    await expect(getAwsAccountId()).rejects.toThrow('GetCallerIdentity returned no account');
    await expect(getAwsAccountId()).resolves.toBe('111111111111');
  });
});
