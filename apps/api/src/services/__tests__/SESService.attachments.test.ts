import {beforeEach, describe, expect, it, vi} from 'vitest';

const sendRawEmail = vi.fn();

vi.mock('@aws-sdk/client-ses', () => ({
  SES: class {
    sendRawEmail = sendRawEmail;
  },
}));

const {sendRawEmail: send} = await import('../SESService');

const base = {
  from: {name: 'Acme', email: 'hello@acme.com'},
  to: ['ana@acme.com'],
  content: {subject: 'Hi', html: '<p>Hi</p>'},
};

const attachment = {filename: 'a.txt', content: 'aGVsbG8=', contentType: 'text/plain'};

/**
 * Attachments are stored and sent later by the worker, so the API schema is not the only way in:
 * the MIME builder refuses header fields that would inject headers (GHSA-q2mj-mrj8-xxj4).
 */
describe('SESService - sendRawEmail attachment headers', () => {
  beforeEach(() => {
    sendRawEmail.mockReset().mockResolvedValue({MessageId: 'id'});
  });

  it('sends a clean attachment', async () => {
    await expect(send({...base, attachments: [attachment]})).resolves.toEqual({messageId: 'id'});
  });

  it.each([
    {contentType: 'text/plain\r\nX-Injected: 1'},
    {contentType: 'text/plain\nX-Injected: 1'},
    {filename: 'a.txt\r\nX-Injected: 1'},
    {contentId: 'logo\nX-Injected: 1', disposition: 'inline' as const},
  ])('refuses %j without sending', async override => {
    await expect(send({...base, attachments: [{...attachment, ...override}]})).rejects.toThrow('line breaks');
    expect(sendRawEmail).not.toHaveBeenCalled();
  });
});
