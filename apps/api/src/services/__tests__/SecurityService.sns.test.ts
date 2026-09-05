import {createSign, generateKeyPairSync} from 'node:crypto';

import {afterEach, describe, expect, it, vi} from 'vitest';

import {SecurityService} from '../SecurityService';

const {ALLOWED_SNS_TOPICS} = vi.hoisted(() => ({
  ALLOWED_SNS_TOPICS: [
    'arn:aws:sns:us-east-1:123456789012:plunk-ses-events',
    'arn:aws:sns:eu-west-1:123456789012:plunk-ses-inbound',
  ] as const,
}));

const {privateKey: snsPrivateKey, publicKey: snsPublicKey} = generateKeyPairSync('rsa', {modulusLength: 2048});
const snsPublicKeyPem = snsPublicKey.export({type: 'spki', format: 'pem'}).toString();

vi.mock('../../app/constants.js', async () => {
  const actual = await vi.importActual('../../app/constants.js');
  return {
    ...actual,
    SNS_TOPIC_ARNS: new Set(ALLOWED_SNS_TOPICS),
  };
});

function signedSnsNotification(topicArn: string, certName: string): Record<string, string> {
  const body = {
    Type: 'Notification',
    MessageId: `message-${certName}`,
    TopicArn: topicArn,
    Message: 'test message',
    Timestamp: '2026-08-26T18:00:00.000Z',
    SignatureVersion: '2',
    SigningCertURL: `https://sns.us-east-1.amazonaws.com/${certName}.pem`,
  } as Record<string, string>;
  const stringToSign = ['Message', 'MessageId', 'Timestamp', 'TopicArn', 'Type']
    .map(key => `${key}\n${body[key]}\n`)
    .join('');

  body.Signature = createSign('RSA-SHA256').update(stringToSign, 'utf8').sign(snsPrivateKey, 'base64');
  return body;
}

describe('SecurityService SNS topic authorization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(ALLOWED_SNS_TOPICS)('accepts a valid signature from configured topic %s', async topicArn => {
    const certName = topicArn.endsWith('inbound') ? 'allowed-inbound' : 'allowed-outbound';
    const fetchMock = vi.fn().mockResolvedValue(new Response(snsPublicKeyPem, {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(SecurityService.verifySnsSignature(signedSnsNotification(topicArn, certName))).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects a valid AWS signature from an unconfigured account before fetching its certificate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(snsPublicKeyPem, {status: 200}));
    vi.stubGlobal('fetch', fetchMock);
    const untrusted = signedSnsNotification('arn:aws:sns:us-east-1:999999999999:plunk-ses-events', 'untrusted-account');

    await expect(SecurityService.verifySnsSignature(untrusted)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a missing TopicArn before fetching a signing certificate', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(snsPublicKeyPem, {status: 200}));
    vi.stubGlobal('fetch', fetchMock);
    const missingTopic = signedSnsNotification(ALLOWED_SNS_TOPICS[0], 'missing-topic');
    delete missingTopic.TopicArn;

    await expect(SecurityService.verifySnsSignature(missingTopic)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
