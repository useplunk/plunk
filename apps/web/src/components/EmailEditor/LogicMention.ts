import {Extension} from '@tiptap/core';
import type {Editor, Range} from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

import {createSuggestionRenderer, SuggestionMenu, type SuggestionRow} from './suggestionPopup';
import {getSuggestionFields} from './VariableMention';

/**
 * A block of Liquid offered by the `{%` menu.
 *
 * `prefix` and `suffix` sandwich the cursor, so picking a block leaves the caret between
 * a matched pair of tags. Unbalanced tags are the most common way a template fails to
 * save, and the author never types the closing tag at all.
 */
interface LogicBlock extends SuggestionRow {
  prefix: string;
  suffix: string;
}

/** Stand-in used before the author has named a field. */
const FIELD_PLACEHOLDER = 'field';

/** Rows per matching field, so a query surfaces several fields rather than one field's variants. */
const SHAPES_PER_FIELD = 3;
const MAX_ROWS = 9;

/**
 * `syntax` shows the whole shape, not just the opening tag: an if and an if/else open
 * identically and differ only in what closes them, so previewing the prefix alone makes
 * two different blocks advertise the same thing.
 */
function block(label: string, prefix: string, suffix: string): LogicBlock {
  return {label, syntax: `${prefix}\u2026${suffix.replace('{% else %}', '{% else %}\u2026')}`, prefix, suffix};
}

/**
 * The shapes worth offering for a field, ordered by how often they are the right answer.
 *
 * Type-aware because the alternative is offering nonsense: `== "value"` on a boolean, or
 * a numeric comparison on a name. The type comes from the same endpoint that populates
 * the `{{` menu.
 */
function blocksForField(field: string, type?: string): LogicBlock[] {
  if (type === 'boolean') {
    return [
      block(`Show when ${field} is true`, `{% if ${field} %}`, '{% endif %}'),
      block(`Show when ${field} is false`, `{% unless ${field} %}`, '{% endunless %}'),
      block(`Show one thing, or another if not`, `{% if ${field} %}`, '{% else %}{% endif %}'),
    ];
  }

  if (type === 'number' || type === 'date') {
    return [
      block(`Show when ${field} is above a value`, `{% if ${field} > 0 %}`, '{% endif %}'),
      block(`Show when ${field} is set`, `{% if ${field} %}`, '{% endif %}'),
      block(`Show one thing, or another if not`, `{% if ${field} %}`, '{% else %}{% endif %}'),
    ];
  }

  return [
    block(`Show when ${field} is set`, `{% if ${field} %}`, '{% endif %}'),
    block(`Show when ${field} matches a value`, `{% if ${field} == "value" %}`, '{% endif %}'),
    block(`Show one thing, or another if missing`, `{% if ${field} %}`, '{% else %}{% endif %}'),
    block(`Hide when ${field} is set`, `{% unless ${field} %}`, '{% endunless %}'),
  ];
}

/** Offered before a field is named. The loop lives here: field types can't identify lists. */
function defaultBlocks(): LogicBlock[] {
  return [
    ...blocksForField(FIELD_PLACEHOLDER).slice(0, 3),
    block(`Hide when ${FIELD_PLACEHOLDER} is set`, `{% unless ${FIELD_PLACEHOLDER} %}`, '{% endunless %}'),
    block('Repeat for each item in a list', '{% for item in items %}', '{% endfor %}'),
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
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(props.prefix + props.suffix)
            .run();

          // Land the caret between the tags, where the content goes. Measured back from
          // where the insert left the selection rather than forward from `range`, which
          // describes the document before the edit.
          editor.commands.setTextSelection(editor.state.selection.from - props.suffix.length);
        },

        render: createSuggestionRenderer(props => new SuggestionMenu<LogicBlock>(props, 'No matching field or block')),
      }),
    ];
  },
});
