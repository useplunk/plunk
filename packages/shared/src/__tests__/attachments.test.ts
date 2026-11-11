import {describe, expect, it} from 'vitest';

import {ActionSchemas} from '../schemas/index.js';

const parse = (attachment: Record<string, unknown>) =>
  ActionSchemas.send.safeParse({
    to: 'ana@acme.com',
    subject: 'Hi',
    body: '<p>Hi</p>',
    attachments: [{filename: 'a.txt', content: 'aGVsbG8=', ...attachment}],
  });

/**
 * Attachment fields are written into MIME part headers as they are, so anything that could end
 * a header line has to be refused before the message is built (GHSA-q2mj-mrj8-xxj4).
 */
describe('send attachments', () => {
  it.each(['application/pdf', 'text/plain; charset=utf-8', 'application/vnd.ms-excel'])('accepts %s', contentType => {
    expect(parse({contentType}).success).toBe(true);
  });

  it.each([
    'text/plain\r\nX-Injected: 1\r\nContent-Transfer-Encoding: 7bit',
    'text/plain\nX-Injected: 1',
    'text/plain\rX-Injected: 1',
    'text/plain\0',
  ])('refuses a content type with control characters: %j', contentType => {
    expect(parse({contentType}).success).toBe(false);
  });
});
