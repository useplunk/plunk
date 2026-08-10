import {Mention} from '@tiptap/extension-mention';
import type {Editor, Range} from '@tiptap/core';

import type {ContactField} from '../../lib/hooks/useContacts';
import {createSuggestionRenderer, SuggestionMenu, type SuggestionRow} from './suggestionPopup';

interface VariableRow extends SuggestionRow {
  /** Named `id` to satisfy Mention's node-attribute shape for the command callback. */
  id: string;
}

/**
 * Variables always available at send time, whatever a contact's data holds. Typed and
 * covered like real fields so every row in the menu reads the same way.
 */
const RUNTIME_FIELDS: ContactField[] = [
  {field: 'id', type: 'string', coverage: 100},
  {field: 'email', type: 'string', coverage: 100},
  {field: 'unsubscribeUrl', type: 'string', coverage: 100},
  {field: 'subscribeUrl', type: 'string', coverage: 100},
  {field: 'manageUrl', type: 'string', coverage: 100},
  {field: 'locale', type: 'string', coverage: 100},
];

const TYPE_LABELS: Record<ContactField['type'], string> = {
  string: 'text',
  number: 'number',
  boolean: 'true/false',
  date: 'date',
};

// Set from the component once the project's fields have loaded.
let contactFields: ContactField[] = [];

export function setAvailableVariables(fields: ContactField[]) {
  contactFields = fields || [];
}

/** The project's fields, runtime variables first. Shared with the `{%` logic menu. */
export function getSuggestionFields(): ContactField[] {
  const seen = new Set(RUNTIME_FIELDS.map(field => field.field));
  return [...RUNTIME_FIELDS, ...contactFields.filter(field => !seen.has(field.field))];
}

/**
 * Describe a field in the terms that decide whether a template works.
 *
 * Coverage is the number that matters and was previously not surfaced anywhere: a
 * `{{plan}}` that only 4% of contacts carry renders blank for everyone else, and the
 * only way to find that out used to be sending the campaign.
 */
function describe(field: ContactField): string | undefined {
  const type = TYPE_LABELS[field.type] ?? 'text';
  return field.coverage < 100 ? `${type} · ${Math.round(field.coverage)}% of contacts` : type;
}

function variableItems(query: string): VariableRow[] {
  const fields = getSuggestionFields();
  const lowerQuery = query.toLowerCase();
  const matches = lowerQuery ? fields.filter(field => field.field.toLowerCase().includes(lowerQuery)) : fields;

  return matches.slice(0, 10).map(field => ({
    id: field.field,
    label: field.field,
    syntax: `{{${field.field}}}`,
    meta: describe(field),
  }));
}

export const VariableMention = Mention.configure({
  HTMLAttributes: {
    class: 'variable-mention',
  },
  renderLabel({node}) {
    return `{{${node.attrs.id}}}`;
  },
  suggestion: {
    char: '{{',

    items: ({query}: {query: string}) => variableItems(query),

    command: ({editor, range, props}: {editor: Editor; range: Range; props: {id: string | null}}) => {
      if (!props?.id) {
        return;
      }

      editor.chain().focus().deleteRange(range).insertContent(`{{${props.id}}}`).run();
    },

    render: createSuggestionRenderer(props => new SuggestionMenu<VariableRow>(props, 'No matching field')),
  },
});
