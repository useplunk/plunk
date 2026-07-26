import {validateTemplate} from '@plunk/shared';

import {ErrorCode, HttpException} from '../exceptions/index.js';

/**
 * Reject template markup the Liquid engine cannot parse.
 *
 * Rendering is deliberately lenient — a template that fails to parse still sends,
 * falling back to plain `{{variable}}` substitution — so authoring time is the only
 * place a syntax error can be surfaced. Failing the write is what stops a broken
 * `{% if %}` from reaching a whole audience.
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
