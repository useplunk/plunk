import {validateTemplate} from '@plunk/shared';
import {describe, expect, it} from 'vitest';

import {blocksForField, defaultBlocks} from '../LogicMention';

/**
 * The menu's promise is that picking a block cannot produce a template that fails to
 * save. That holds only if every block definition is itself valid Liquid, which is easy
 * to break with a typo in a closing tag — and the typo would ship as a broken menu
 * entry, not a compile error. So the definitions are checked against the same parser the
 * API validates with.
 */
const TYPES = [undefined, 'string', 'number', 'date', 'boolean'];

const ALL_BLOCKS = [...TYPES.flatMap(type => blocksForField('plan', type)), ...defaultBlocks()];

describe('logic blocks', () => {
  it.each(ALL_BLOCKS.map(block => [block.label, block] as const))('%s is valid Liquid', (_label, block) => {
    // Content in the gaps, as an author would fill them.
    const filled = block.lines.map(line => line || 'content').join('');

    expect(validateTemplate(filled)).toMatchObject({valid: true});
  });

  it.each(ALL_BLOCKS.map(block => [block.label, block] as const))('%s parses when left empty', (_label, block) => {
    // Picking a block and typing nothing must still leave a saveable template.
    expect(validateTemplate(block.lines.join(''))).toMatchObject({valid: true});
  });

  it('gives every block somewhere for the caret to land', () => {
    for (const block of ALL_BLOCKS) {
      expect(block.caretLine).toBeGreaterThanOrEqual(0);
      expect(block.lines[block.caretLine]).toBe('');
    }
  });

  it('offers case only where more than two outcomes are possible', () => {
    const labels = (type?: string) => blocksForField('plan', type).map(block => block.syntax);

    expect(labels('string').some(syntax => syntax.includes('{% case'))).toBe(true);
    // A boolean has two states; a multi-way branch on it is noise.
    expect(labels('boolean').some(syntax => syntax.includes('{% case'))).toBe(false);
  });
});
