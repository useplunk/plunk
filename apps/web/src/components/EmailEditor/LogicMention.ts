import {Extension} from '@tiptap/core';
import type {Editor, Range} from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

import {createSuggestionRenderer, SuggestionMenu, type SuggestionRow} from './suggestionPopup';
import {getSuggestionFields} from './VariableMention';

/**
 * A block of Liquid offered by the `{%` menu.
 *
 * Described as lines, where an empty string is an editable gap. That single shape covers
 * both insertions: on an empty line the block is written across paragraphs with the gap
 * already open, and mid-sentence the same lines collapse to an inline pair around the
 * caret. Either way both tags arrive together, so an unbalanced block — the most common
 * reason a template fails to save — is not reachable through the menu.
 */
interface LogicBlock extends SuggestionRow {
  lines: string[];
  /** Index of the gap the caret lands in. */
  caretLine: number;
}

/** Everything after the opening tag, for the inline form. */
function inlineSuffix(block: LogicBlock): string {
  return block.lines.slice(1).join('');
}

/** Stand-in used before the author has named a field. */
const FIELD_PLACEHOLDER = 'field';

/** Rows per matching field, so a query surfaces several fields rather than one field's variants. */
const SHAPES_PER_FIELD = 4;
const MAX_ROWS = 9;

/**
 * `syntax` shows the whole shape, not just the opening tag: an if and an if/else open
 * identically and differ only in what closes them, so previewing the prefix alone makes
 * two different blocks advertise the same thing.
 */
function block(label: string, ...lines: string[]): LogicBlock {
  return {
    label,
    syntax: lines.map(line => line || '\u2026').join(''),
    lines,
    caretLine: lines.indexOf(''),
  };
}

/**
 * The shapes worth offering for a field, ordered by how often they are the right answer.
 *
 * Type-aware because the alternative is offering nonsense: `== "value"` on a boolean, a
 * numeric comparison on a name, or a multi-way `case` on something with two states. The
 * type comes from the same endpoint that populates the `{{` menu.
 */
export function blocksForField(field: string, type?: string): LogicBlock[] {
  if (type === 'boolean') {
    return [
      block(`Show when ${field} is true`, `{% if ${field} %}`, '', '{% endif %}'),
      block(`Show when ${field} is false`, `{% unless ${field} %}`, '', '{% endunless %}'),
      block(`Show one thing, or another if not`, `{% if ${field} %}`, '', '{% else %}', '', '{% endif %}'),
    ];
  }

  if (type === 'number' || type === 'date') {
    return [
      block(`Show when ${field} is above a value`, `{% if ${field} > 0 %}`, '', '{% endif %}'),
      block(`Show when ${field} is below a value`, `{% if ${field} < 0 %}`, '', '{% endif %}'),
      block(`Show when ${field} is set`, `{% if ${field} %}`, '', '{% endif %}'),
      block(`Show one thing, or another if not`, `{% if ${field} %}`, '', '{% else %}', '', '{% endif %}'),
    ];
  }

  return [
    block(`Show when ${field} is set`, `{% if ${field} %}`, '', '{% endif %}'),
    block(`Show when ${field} matches a value`, `{% if ${field} == "value" %}`, '', '{% endif %}'),
    block(
      `Pick a version per ${field} value`,
      `{% case ${field} %}`,
      `{% when "value" %}`,
      '',
      '{% else %}',
      '',
      '{% endcase %}',
    ),
    block(`Show one thing, or another if missing`, `{% if ${field} %}`, '', '{% else %}', '', '{% endif %}'),
    block(`Show when ${field} contains a value`, `{% if ${field} contains "value" %}`, '', '{% endif %}'),
    block(`Hide when ${field} is set`, `{% unless ${field} %}`, '', '{% endunless %}'),
  ];
}

/**
 * Offered before a field is named: the shapes above against a placeholder, plus the ones
 * that are about structure rather than a particular field. Loops live here because field
 * types cannot identify a list — the endpoint reports arrays as strings.
 */
export function defaultBlocks(): LogicBlock[] {
  return [
    ...blocksForField(FIELD_PLACEHOLDER).slice(0, 4),
    block(`Hide when ${FIELD_PLACEHOLDER} is set`, `{% unless ${FIELD_PLACEHOLDER} %}`, '', '{% endunless %}'),
    block('Repeat for each item in a list', '{% for item in items %}', '', '{% endfor %}'),
    block(
      'Repeat for each item, or show a fallback when empty',
      '{% for item in items %}',
      '',
      '{% else %}',
      '',
      '{% endfor %}',
    ),
    block('Add a note that never sends', '{% comment %}', '', '{% endcomment %}'),
    block('Show template markup as literal text', '{% raw %}', '', '{% endraw %}'),
  ];
}

/**
 * Build the menu.
 *
 * Typing matches against the project's real contact fields, so `{% ema` offers blocks
 * already filled in with `email` — the same "pick from what your contacts actually
 * have" affordance the `{{` menu provides, extended to control flow. Capped per field
 * so a query matching several fields shows several fields.
 */
function logicItems(query: string): LogicBlock[] {
  if (!query) {
    return defaultBlocks();
  }

  const lowerQuery = query.toLowerCase();
  const matchingFields = getSuggestionFields().filter(field => field.field.toLowerCase().includes(lowerQuery));

  if (matchingFields.length > 0) {
    return matchingFields
      .flatMap(field =>
        blocksForField(field.field, field.type)
          .slice(0, SHAPES_PER_FIELD)
          .map(shape => ({
            ...shape,
            meta: field.coverage < 100 ? `${Math.round(field.coverage)}% of contacts` : undefined,
          })),
      )
      .slice(0, MAX_ROWS);
  }

  return defaultBlocks().filter(item => item.label.toLowerCase().includes(lowerQuery));
}

/**
 * Offer ready-made Liquid blocks when the author types `{%`.
 *
 * The `{{` menu works because it is populated from the project's real contact fields —
 * nothing has to be remembered. Control flow had no equivalent: you had to know the
 * syntax, spell `endif` correctly, and close what you opened.
 */
export const LogicMention = Extension.create({
  name: 'logicMention',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '{%',
        allowSpaces: false,
        startOfLine: false,

        items: ({query}: {query: string}) => logicItems(query),

        command: ({editor, range, props}: {editor: Editor; range: Range; props: LogicBlock}) => {
          // Was the author starting a fresh line, or writing mid-sentence? Inserting a
          // multi-line block into the middle of a sentence would break the sentence; an
          // inline pair on an empty line leaves you typing between two adjacent tags with
          // no room, which is the awkward case this distinction exists to avoid.
          const parent = editor.state.doc.resolve(range.from).parent;
          const trigger = editor.state.doc.textBetween(range.from, range.to);
          const onOwnLine = parent.textContent.trim() === trigger.trim();

          if (!onOwnLine) {
            const suffix = inlineSuffix(props);

            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent(props.lines[0] + suffix)
              .run();

            // Measured back from where the insert left the selection rather than forward
            // from `range`, which describes the document before the edit.
            editor.commands.setTextSelection(editor.state.selection.from - suffix.length);
            return;
          }

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(
              props.lines.map(line => ({
                type: 'paragraph',
                ...(line ? {content: [{type: 'text', text: line}]} : {}),
              })),
            )
            .run();

          // Walk back from the end of the last line to the gap's own paragraph. Each
          // paragraph boundary costs one position on top of its text.
          const trailing = props.lines.slice(props.caretLine + 1);
          const offset = trailing.reduce((total, line) => total + line.length + 2, 0);
          editor.commands.setTextSelection(editor.state.selection.from - offset);
        },

        render: createSuggestionRenderer(props => new SuggestionMenu<LogicBlock>(props, 'No matching field or block')),
      }),
    ];
  },
});
