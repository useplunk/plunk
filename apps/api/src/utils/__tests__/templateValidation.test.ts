import {describe, expect, it} from 'vitest';

import {HttpException} from '../../exceptions/index.js';
import {assertValidTemplateSyntax} from '../templateValidation.js';

/**
 * Rendering is intentionally forgiving — a broken template still sends, falling back to
 * plain placeholder substitution. That makes write time the only place a syntax error
 * can be reported, so this guard is what stops a broken `{% if %}` reaching an audience.
 */
describe('assertValidTemplateSyntax', () => {
  it('accepts legacy placeholder syntax', () => {
    expect(() =>
      assertValidTemplateSyntax({subject: 'Hi {{firstName ?? there}}', body: '<p>{{data.plan}}</p>'}),
    ).not.toThrow();
  });

  it('accepts Liquid conditionals, loops and filters', () => {
    expect(() =>
      assertValidTemplateSyntax({
        subject: '{% if locale == "es" %}Hola{% else %}Hi{% endif %}',
        body: '<ul>{% for item in cart %}<li>{{item.name | upcase}}</li>{% endfor %}</ul>',
      }),
    ).not.toThrow();
  });

  it('ignores fields that are absent or empty', () => {
    expect(() => assertValidTemplateSyntax({subject: undefined, body: ''})).not.toThrow();
    expect(() => assertValidTemplateSyntax({body: null})).not.toThrow();
  });

  it('rejects an unclosed tag with a 400 naming the field and position', () => {
    let thrown: unknown;
    try {
      assertValidTemplateSyntax({body: '<p>ok</p>\n{% if plan == "pro" %}Pro'});
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    const exception = thrown as HttpException;
    expect(exception.code).toBe(400);
    expect(exception.message).toContain('body');
    expect(exception.message).toContain('line 2');
    expect(exception.details).toMatchObject({field: 'body', line: 2});
  });

  it('rejects an unclosed placeholder', () => {
    expect(() => assertValidTemplateSyntax({subject: 'Hi {{firstName'})).toThrow(HttpException);
  });

  it('rejects a filter typo that rendering would silently drop', () => {
    expect(() => assertValidTemplateSyntax({body: '{{firstName | upcse}}'})).toThrow(/upcse/);
  });

  it('rejects the file-system tags', () => {
    expect(() => assertValidTemplateSyntax({body: "{% render 'secrets' %}"})).toThrow(/not available/);
    expect(() => assertValidTemplateSyntax({body: "{% include 'secrets' %}"})).toThrow(/not available/);
  });

  it('reports the first offending field', () => {
    expect(() => assertValidTemplateSyntax({subject: '{% if %}', body: 'fine'})).toThrow(/subject/);
  });
});
