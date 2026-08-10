import {describe, expect, it} from 'vitest';

import type {ContactField} from '../hooks/useContacts';
import {lintTemplateFields} from '../templateLint';

/**
 * This lint catches the mistake syntax validation cannot see: `{% if emai %}` parses,
 * and is then silently false for every contact forever.
 *
 * Its only real failure mode is crying wolf. A warning that fires on a correct template
 * teaches authors to ignore the strip, which costs more than the mistakes it catches —
 * so most of what follows checks that it stays quiet.
 */
const FIELDS: ContactField[] = [
  {field: 'firstName', type: 'string', coverage: 96},
  {field: 'plan', type: 'string', coverage: 88},
  {field: 'cart', type: 'string', coverage: 71},
  {field: 'trialEndsAt', type: 'date', coverage: 12},
];

describe('lintTemplateFields', () => {
  describe('typos', () => {
    it('flags a field no contact has, and proposes the near miss', () => {
      const [warning] = lintTemplateFields('{% if firstNam %}Hi{% endif %}', FIELDS);

      expect(warning?.kind).toBe('unknown');
      expect(warning?.field).toBe('firstNam');
      expect(warning?.message).toContain('firstName');
    });

    it('flags an unknown field with no near miss, without inventing one', () => {
      const [warning] = lintTemplateFields('{{ favouriteColour }}', FIELDS);

      expect(warning?.kind).toBe('unknown');
      expect(warning?.message).toContain('always be empty');
      expect(warning?.message).not.toContain('Did you mean');
    });

    it('catches the case from the report: a valid tag that is silently always false', () => {
      const warnings = lintTemplateFields('{% if emai %}You have an address{% endif %}', FIELDS);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.message).toContain('email');
    });
  });

  describe('sparse fields', () => {
    it('reports how few contacts carry a field', () => {
      const [warning] = lintTemplateFields('{% if trialEndsAt %}Your trial ends soon{% endif %}', FIELDS);

      expect(warning?.kind).toBe('sparse');
      expect(warning?.message).toContain('12%');
    });

    it('stays quiet for well-covered fields', () => {
      expect(lintTemplateFields('Hi {{firstName}}, you are on {{plan}}', FIELDS)).toEqual([]);
    });

    it('leads with the typo when both are present', () => {
      const warnings = lintTemplateFields('{{trialEndsAt}} {{firstNam}}', FIELDS);

      expect(warnings[0]?.kind).toBe('unknown');
    });
  });

  describe('staying quiet', () => {
    it('says nothing before the field list has loaded', () => {
      expect(lintTemplateFields('{{ anything }}', [])).toEqual([]);
    });

    it('accepts variables the renderer always provides', () => {
      expect(lintTemplateFields('{{email}} {{unsubscribeUrl}} {{id}} {{locale}}', FIELDS)).toEqual([]);
    });

    it('accepts the workflow event payload', () => {
      // Workflow step templates are edited on the same screen and read the trigger's
      // event, whose keys are not contact fields.
      expect(lintTemplateFields('{% if event %}{{event.plan}}{% endif %}', FIELDS)).toEqual([]);
    });

    it('accepts data-prefixed access', () => {
      expect(lintTemplateFields('{{data.plan}}', FIELDS)).toEqual([]);
    });

    it('accepts loop variables and forloop', () => {
      const source = '{% for item in cart %}{{item.name}} {{forloop.index}}{% endfor %}';

      expect(lintTemplateFields(source, FIELDS)).toEqual([]);
    });

    it('accepts assigned and captured names', () => {
      const source = '{% assign tier = plan %}{{tier}}{% capture greeting %}Hi{% endcapture %}{{greeting}}';

      expect(lintTemplateFields(source, FIELDS)).toEqual([]);
    });

    it('does not read filters or their arguments as fields', () => {
      expect(lintTemplateFields('{{ plan | upcase | default: "none" }}', FIELDS)).toEqual([]);
    });

    it('does not read string literals as fields', () => {
      expect(lintTemplateFields('{% if plan == "enterprise" %}Enterprise{% endif %}', FIELDS)).toEqual([]);
    });

    it('does not read a legacy ?? fallback as a field', () => {
      // The fallback has always been a literal, so `there` is text and not a variable.
      expect(lintTemplateFields('Hi {{firstName ?? there}}', FIELDS)).toEqual([]);
    });

    it('ignores everything inside a raw block', () => {
      expect(lintTemplateFields('{% raw %}{{ notAField }}{% endraw %}', FIELDS)).toEqual([]);
    });

    it('ignores Liquid keywords and operators', () => {
      const source = '{% if plan == "pro" and cart %}A{% elsif plan %}B{% else %}C{% endif %}';

      expect(lintTemplateFields(source, FIELDS)).toEqual([]);
    });

    it('ignores the entities the rich-text editor escapes markup into', () => {
      // TipTap serialises through the DOM, so a typed `>` is stored as `&gt;` — whose
      // letters tokenize as an identifier if entities are not stripped first.
      expect(lintTemplateFields('{% if plan == &quot;pro&quot; and cart &gt; 0 %}A{% endif %}', FIELDS)).toEqual([]);
    });

    it('ignores plain prose and HTML around the markup', () => {
      const source = '<p style="color: red">Hello there, friend</p><a href="https://example.com">Link</a>';

      expect(lintTemplateFields(source, FIELDS)).toEqual([]);
    });
  });

  it('reports each field once and caps the list', () => {
    const source = '{{a1}} {{a1}} {{b2}} {{c3}} {{d4}} {{e5}}';
    const warnings = lintTemplateFields(source, FIELDS);

    expect(warnings.length).toBeLessThanOrEqual(3);
    expect(new Set(warnings.map(w => w.field)).size).toBe(warnings.length);
  });
});
