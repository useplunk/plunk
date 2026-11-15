import {validateTemplate} from '@plunk/shared';
import {z} from 'zod';

import {ErrorCode, HttpException} from '../exceptions/index.js';

/**
 * Reject template markup the Liquid engine cannot parse.
 *
 * Rendering is deliberately lenient — a template that fails to parse still sends,
 * falling back to plain `{{variable}}` substitution — so authoring time is the only
 * place a syntax error can be surfaced. Failing the write is what stops a broken
 * `{% if %}` from reaching a whole audience.
 *
 * Only for authoring surfaces — templates and campaigns, where a human is editing and
 * an audience is at stake. `/v1/send` is left unchecked on purpose: its bodies come
 * from other systems and rendering already degrades gracefully.
 */
export function assertValidTemplateSyntax(fields: Record<string, unknown>): void {
  for (const [field, source] of Object.entries(fields)) {
    if (typeof source !== 'string' || source.length === 0) {
      continue;
    }

    const result = validateTemplate(source);

    if (!result.valid) {
      const position = result.line !== undefined ? ` (line ${result.line}, column ${result.column})` : '';

      throw new HttpException(
        400,
        `Invalid template syntax in ${field}${position}: ${result.error}`,
        ErrorCode.VALIDATION_ERROR,
        {field, line: result.line, column: result.column},
      );
    }
  }
}

/**
 * Reject a Reply-To that is not an email address.
 *
 * Unlike `from`, Reply-To may be on any domain, so the dashboard takes it as free
 * text. Checking it here keeps a typo out of every email the template or campaign sends.
 * Absent or empty values are allowed: they fall back to the from address.
 */
export function assertValidReplyTo(replyTo: unknown): void {
  if (replyTo === undefined || replyTo === null || replyTo === '') {
    return;
  }

  if (!z.string().email().safeParse(replyTo).success) {
    throw new HttpException(400, 'Reply-To must be a valid email address', ErrorCode.VALIDATION_ERROR, {
      field: 'replyTo',
    });
  }
}
