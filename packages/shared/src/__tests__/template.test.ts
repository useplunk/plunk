import {beforeEach, describe, expect, it, vi} from 'vitest';

import {clearTemplateCache, compileTemplate, renderTemplate, validateTemplate} from '../template/index.js';

/**
 * The template engine is Liquid (see issue #426), replacing a regex-based
 * `{{variable}}` substitution. Two things matter equally here: that the Liquid
 * features campaigns need actually work, and that every template written against the
 * old syntax keeps rendering byte for byte.
 */
describe('renderTemplate', () => {
  beforeEach(() => {
    clearTemplateCache();
  });

  // ========================================
  // BACKWARDS COMPATIBILITY WITH {{variable}}
  // ========================================
  describe('legacy placeholder syntax', () => {
    it('substitutes a top-level variable', () => {
      expect(renderTemplate('Hello {{name}}!', {name: 'World'})).toBe('Hello World!');
    });

    it('substitutes a nested path', () => {
      expect(renderTemplate('Hello {{data.firstName}}!', {data: {firstName: 'Ada'}})).toBe('Hello Ada!');
    });

    it('resolves a key nested under data without the prefix', () => {
      expect(renderTemplate('Hello {{firstName}}!', {data: {firstName: 'Ada'}})).toBe('Hello Ada!');
    });

    it('prefers a top-level key over the same key under data', () => {
      expect(renderTemplate('{{plan}}', {plan: 'pro', data: {plan: 'free'}})).toBe('pro');
    });

    it('renders an unquoted ?? fallback when the value is missing', () => {
      expect(renderTemplate('Hello {{name ?? Guest}}!', {})).toBe('Hello Guest!');
    });

    it('renders a quoted ?? fallback when the value is missing', () => {
      expect(renderTemplate("Hello {{firstName ?? 'there'}}!", {})).toBe('Hello there!');
    });

    it('ignores the ?? fallback when the value is present', () => {
      expect(renderTemplate('Hello {{firstName ?? there}}!', {firstName: 'Ada'})).toBe('Hello Ada!');
    });

    it('treats the ?? fallback as a literal, not a variable reference', () => {
      expect(renderTemplate('{{plan ?? free}}', {free: 'SHOULD NOT APPEAR'})).toBe('free');
    });

    it('uses the first of several ?? fallbacks, as the old renderer did', () => {
      // Fallbacks are literals, so the first one is always non-empty and wins.
      expect(renderTemplate('{{a ?? b ?? c}}', {})).toBe('b');
    });

    it('keeps a fallback containing spaces intact', () => {
      expect(renderTemplate('{{title ?? Dear customer}}', {})).toBe('Dear customer');
    });

    it('renders a missing variable as an empty string', () => {
      expect(renderTemplate('Hello {{missing}}!', {})).toBe('Hello !');
    });

    it('renders a missing nested path as an empty string', () => {
      expect(renderTemplate('[{{a.b.c}}]', {a: {}})).toBe('[]');
    });

    it('renders a bare array as HTML list items', () => {
      expect(renderTemplate('{{items}}', {items: ['one', 'two']})).toBe('<li>one</li>\n<li>two</li>');
    });

    it('resolves keys containing spaces, which CSV imports produce from headers', () => {
      expect(renderTemplate('Hi {{first name}}!', {'first name': 'Ada'})).toBe('Hi Ada!');
    });

    it('resolves a nested key containing spaces', () => {
      expect(renderTemplate('{{profile.first name}}', {profile: {'first name': 'Ada'}})).toBe('Ada');
    });

    it('renders an empty placeholder as an empty string', () => {
      expect(renderTemplate('[{{}}][{{ }}]', {})).toBe('[][]');
    });

    it('renders numbers and objects the way the old renderer did', () => {
      expect(renderTemplate('{{count}}', {count: 42})).toBe('42');
      expect(renderTemplate('[{{o}}]', {o: {a: 1}})).toBe('[[object Object]]');
    });

    it('leaves unrelated braces alone', () => {
      expect(renderTemplate('<style>a { color: red }</style>', {})).toBe('<style>a { color: red }</style>');
    });

    it('leaves a double brace it cannot resolve alone, as before', () => {
      expect(renderTemplate('<style>a{{color:red}}</style>', {})).toBe('<style>a</style>');
    });
  });

  // ========================================
  // DELIBERATE DIVERGENCES FROM THE OLD RENDERER
  // ========================================
  describe('intentional differences from the previous renderer', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('strips the quotes from a quoted ?? fallback', () => {
      // The old renderer split on `??` and returned the raw text, so the quotes ended up
      // in the email: `Hi {{name ?? 'there'}}` rendered as `Hi 'there'`. The documented
      // behaviour has always been `Hi there`, which is what Liquid's `default:` gives.
      expect(renderTemplate("Hi {{name ?? 'there'}}", {})).toBe('Hi there');
      expect(renderTemplate('Hi {{name ?? "there"}}', {})).toBe('Hi there');
    });

    it('renders falsy values instead of blanking them', () => {
      // The old lookup chained with `||`, so any falsy value fell through to the
      // fallback and rendered empty. `{{subscribed}}` is documented as rendering
      // true/false, which only works now.
      expect(renderTemplate('[{{count}}]', {count: 0})).toBe('[0]');
      expect(renderTemplate('[{{subscribed}}]', {subscribed: false})).toBe('[false]');
      expect(renderTemplate('[{{a.b}}]', {a: {b: 0}})).toBe('[0]');
    });

    it('no longer truncates a ?? fallback at a ?? inside quotes', () => {
      expect(renderTemplate('{{name ?? "a ?? b"}}', {})).toBe('a ?? b');
    });

    it('resolves placeholders that span lines and array indexes', () => {
      // Both rendered as literal text / empty before.
      expect(renderTemplate('{{\n name \n}}', {name: 'Ada'})).toBe('Ada');
      expect(renderTemplate('[{{items.0}}]', {items: ['a', 'b']})).toBe('[a]');
    });

    it('evaluates balanced tag markup that used to be literal body copy', () => {
      // The main upgrade risk: prose that happens to contain balanced Liquid markup is
      // now executed rather than printed. Unbalanced markup still fails to parse and
      // falls back, so it survives unchanged.
      expect(renderTemplate('Docs: {% if x %}shown{% endif %} end', {})).toBe('Docs:  end');
      expect(renderTemplate('Use {% if x %} in docs', {})).toBe('Use {% if x %} in docs');
    });
  });

  // ========================================
  // LIQUID FEATURES REQUESTED IN THE TICKET
  // ========================================
  describe('conditionals', () => {
    it('branches on a contact field, the multilanguage case', () => {
      const template = `{% if locale == 'es' %}Hola{% elsif locale == 'fr' %}Bonjour{% else %}Hello{% endif %}`;

      expect(renderTemplate(template, {locale: 'es'})).toBe('Hola');
      expect(renderTemplate(template, {locale: 'fr'})).toBe('Bonjour');
      expect(renderTemplate(template, {locale: 'de'})).toBe('Hello');
      expect(renderTemplate(template, {})).toBe('Hello');
    });

    it('supports case/when', () => {
      const template = `{% case plan %}{% when 'pro' %}20% off{% when 'free' %}Upgrade{% else %}Thanks{% endcase %}`;

      expect(renderTemplate(template, {plan: 'pro'})).toBe('20% off');
      expect(renderTemplate(template, {plan: 'free'})).toBe('Upgrade');
      expect(renderTemplate(template, {plan: 'enterprise'})).toBe('Thanks');
    });

    it('supports comparison and boolean operators', () => {
      expect(renderTemplate('{% if ltv > 100 and plan == "pro" %}VIP{% endif %}', {ltv: 240, plan: 'pro'})).toBe('VIP');
      expect(renderTemplate('{% if ltv > 100 and plan == "pro" %}VIP{% endif %}', {ltv: 40, plan: 'pro'})).toBe('');
      expect(renderTemplate('{% unless subscribed %}Resubscribe{% endunless %}', {subscribed: false})).toBe(
        'Resubscribe',
      );
    });

    it('treats a blank custom field as falsy', () => {
      // Contact data comes from CSV imports where "column present but empty" is the
      // norm, so `jsTruthy` is enabled rather than Liquid's Shopify-compatible default.
      expect(renderTemplate('{% if firstName %}Hi {{firstName}}{% else %}Hi there{% endif %}', {firstName: ''})).toBe(
        'Hi there',
      );
    });
  });

  describe('loops', () => {
    it('iterates an array of primitives', () => {
      const template = '{% for item in items %}<li>{{item}}</li>{% endfor %}';

      expect(renderTemplate(template, {items: ['a', 'b']})).toBe('<li>a</li><li>b</li>');
    });

    it('iterates an array of objects with forloop metadata', () => {
      const template = '{% for p in products %}{{forloop.index}}. {{p.name}} — {{p.price}}\n{% endfor %}';

      expect(renderTemplate(template, {products: [{name: 'Pro', price: 10}, {name: 'Team', price: 20}]})).toBe(
        '1. Pro — 10\n2. Team — 20\n',
      );
    });

    it('renders nothing for an empty or missing collection', () => {
      expect(renderTemplate('{% for i in items %}x{% endfor %}', {items: []})).toBe('');
      expect(renderTemplate('{% for i in items %}x{% endfor %}', {})).toBe('');
    });
  });

  describe('filters', () => {
    it('applies string and number filters', () => {
      expect(renderTemplate('{{name | upcase}}', {name: 'ada'})).toBe('ADA');
      expect(renderTemplate('{{tags | join: ", "}}', {tags: ['a', 'b']})).toBe('a, b');
      expect(renderTemplate('{{price | times: 0.8 | round: 2}}', {price: 50})).toBe('40');
    });

    it('applies the default filter, the modern form of ??', () => {
      expect(renderTemplate('{{firstName | default: "there"}}', {})).toBe('there');
    });

    it('formats dates', () => {
      expect(renderTemplate('{{signupDate | date: "%Y-%m"}}', {signupDate: '2026-05-06T12:00:00Z'})).toBe('2026-05');
    });

    it('skips an unknown filter rather than failing the send', () => {
      expect(renderTemplate('{{name | upcse}}', {name: 'ada'})).toBe('ada');
    });
  });

  describe('assignment', () => {
    it('supports assign for derived values, the pricing case', () => {
      const template =
        '{% assign discount = ltv | divided_by: 10 %}{% if discount > 20 %}20{% else %}{{discount}}{% endif %}% off';

      expect(renderTemplate(template, {ltv: 150})).toBe('15% off');
      expect(renderTemplate(template, {ltv: 900})).toBe('20% off');
    });

    it('supports capture', () => {
      expect(renderTemplate('{% capture greeting %}Hi {{name}}{% endcapture %}{{greeting}}!', {name: 'Ada'})).toBe(
        'Hi Ada!',
      );
    });
  });

  describe('whitespace control and comments', () => {
    it('trims with the dash markers', () => {
      expect(renderTemplate('a{%- if true -%} b {%- endif -%}c', {})).toBe('abc');
      expect(renderTemplate('[{{- name -}}]', {name: 'x'})).toBe('[x]');
    });

    it('drops comment blocks', () => {
      expect(renderTemplate('a{% comment %}note{% endcomment %}b', {})).toBe('ab');
    });

    it('emits raw blocks verbatim', () => {
      expect(renderTemplate('{% raw %}{{ not a variable }}{% endraw %}', {'not a variable': 'x'})).toBe(
        '{{ not a variable }}',
      );
    });
  });

  // ========================================
  // MARKUP TYPED IN THE RICH-TEXT EDITOR
  // ========================================
  describe('HTML-escaped markup', () => {
    it('decodes comparison operators escaped by the editor', () => {
      expect(renderTemplate('{% if age &gt; 18 %}adult{% endif %}', {age: 21})).toBe('adult');
      expect(renderTemplate('{% if age &lt;= 18 %}minor{% endif %}', {age: 12})).toBe('minor');
    });

    it('decodes escaped quotes and non-breaking spaces inside delimiters', () => {
      expect(renderTemplate('{% if plan == &quot;pro&quot; %}Pro{% endif %}', {plan: 'pro'})).toBe('Pro');
      expect(renderTemplate('{%&nbsp;if plan == &#39;pro&#39; %}Pro{% endif %}', {plan: 'pro'})).toBe('Pro');
    });

    it('does not decode entities outside delimiters', () => {
      expect(renderTemplate('Tom &amp; Jerry {{name}}', {name: 'x'})).toBe('Tom &amp; Jerry x');
    });
  });

  // ========================================
  // SANDBOXING
  // ========================================
  describe('sandboxing', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it.each(['include', 'render', 'layout'])('refuses the {%% %s %%} tag, which reads from disk', tag => {
      const template = `{% ${tag} 'package.json' %}`;
      const result = validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.error).toContain(`{% ${tag} %} tag is not available`);
      // The file's contents must never reach the rendered email.
      expect(renderTemplate(template, {})).not.toContain('"dependencies"');
    });

    it('does not expose prototype members of contact data', () => {
      expect(renderTemplate('[{{profile.constructor}}][{{profile.__proto__}}]', {profile: {}})).toBe('[][]');
    });

    it('aborts a runaway loop instead of blocking the worker', () => {
      const result = renderTemplate('{% for i in (1..100000000) %}x{% endfor %}', {});

      // Falls back to legacy substitution, which leaves the tag as literal text.
      expect(result).toContain('{% for i in (1..100000000) %}');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ========================================
  // ERROR HANDLING
  // ========================================
  describe('malformed templates', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    it('never throws', () => {
      expect(() => renderTemplate('{% if %}{% endfor %}', {})).not.toThrow();
      expect(() => renderTemplate('{{ | | }}', {})).not.toThrow();
    });

    it('falls back to placeholder substitution when parsing fails', () => {
      // An unterminated `{{` used to be left as literal text; it still is, and the
      // well-formed placeholder next to it still resolves.
      expect(renderTemplate('{{name}} and {{ unclosed', {name: 'Ada'})).toBe('Ada and {{ unclosed');
    });

    it('logs once per template rather than once per recipient', () => {
      const template = '{% if %}';

      for (let i = 0; i < 100; i += 1) {
        renderTemplate(template, {});
      }

      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('compileTemplate', () => {
  beforeEach(() => {
    clearTemplateCache();
  });

  it('renders one parsed template against many recipients', () => {
    const compiled = compileTemplate('Hi {{name}}, you are on {{plan}}.');

    expect(compiled.valid).toBe(true);
    expect(compiled.render({name: 'Ada', plan: 'pro'})).toBe('Hi Ada, you are on pro.');
    expect(compiled.render({name: 'Bob', plan: 'free'})).toBe('Hi Bob, you are on free.');
  });

  it('does not leak state between renders', () => {
    const compiled = compileTemplate('{% assign total = price | plus: 10 %}{{total}}');

    expect(compiled.render({price: 1})).toBe('11');
    expect(compiled.render({price: 2})).toBe('12');
  });

  it('exposes the original source and reports an invalid template', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const compiled = compileTemplate('{% if %}');

    expect(compiled.source).toBe('{% if %}');
    expect(compiled.valid).toBe(false);
    expect(compiled.render({})).toBe('{% if %}');
  });
});

describe('validateTemplate', () => {
  beforeEach(() => {
    clearTemplateCache();
  });

  it('accepts legacy and Liquid syntax', () => {
    expect(validateTemplate('Hi {{firstName ?? there}}!')).toEqual({valid: true});
    expect(validateTemplate('{% if locale == "es" %}Hola{% endif %}')).toEqual({valid: true});
    expect(validateTemplate('{{first name}}')).toEqual({valid: true});
    expect(validateTemplate('')).toEqual({valid: true});
  });

  it('reports an unclosed tag with its position', () => {
    const result = validateTemplate('line one\n{% if plan == "pro" %}Pro');

    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toMatch(/line:\d+/);
    expect(result.line).toBe(2);
    expect(result.column).toBeGreaterThan(0);
  });

  it('reports an unclosed placeholder', () => {
    expect(validateTemplate('Hi {{ name').valid).toBe(false);
  });

  it('reports an unknown filter, which rendering would silently skip', () => {
    const result = validateTemplate('{{name | upcse}}');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('upcse');
  });

  it('reports an unknown tag', () => {
    expect(validateTemplate('{% loop %}x{% endloop %}').valid).toBe(false);
  });
});
