import type {FormField, FormFieldType} from '@plunk/types';

export type FormFieldValues = Record<string, string | number | boolean>;

/** Reserved fieldOrder token for the required email field (not a custom field key) */
export const FORM_EMAIL_FIELD_KEY = '$email';

export function resolveFieldOrder(fieldOrder: string[] | undefined, fields: FormField[]): string[] {
  const fieldKeySet = new Set(fields.map(f => f.key));
  const result: string[] = [];
  const seen = new Set<string>();

  for (const key of fieldOrder ?? []) {
    if (key === FORM_EMAIL_FIELD_KEY) {
      if (!seen.has(key)) {
        result.push(key);
        seen.add(key);
      }
      continue;
    }
    if (fieldKeySet.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  }

  if (!seen.has(FORM_EMAIL_FIELD_KEY)) {
    result.unshift(FORM_EMAIL_FIELD_KEY);
  }

  for (const field of fields) {
    if (!seen.has(field.key)) {
      result.push(field.key);
    }
  }

  return result;
}

export function reorderFieldsFromOrder(fields: FormField[], fieldOrder: string[]): FormField[] {
  const byKey = new Map(fields.map(f => [f.key, f]));
  const ordered: FormField[] = [];

  for (const key of fieldOrder) {
    if (key === FORM_EMAIL_FIELD_KEY) continue;
    const field = byKey.get(key);
    if (field) {
      ordered.push(field);
      byKey.delete(key);
    }
  }

  for (const field of byKey.values()) {
    ordered.push(field);
  }

  return ordered;
}

export const FORM_FIELD_TYPE_OPTIONS: Array<{value: FormFieldType; label: string}> = [
  {value: 'text', label: 'Text'},
  {value: 'email', label: 'Email'},
  {value: 'textarea', label: 'Textarea'},
  {value: 'number', label: 'Number'},
  {value: 'tel', label: 'Phone'},
  {value: 'url', label: 'URL'},
  {value: 'date', label: 'Date'},
  {value: 'select', label: 'Select'},
  {value: 'checkbox', label: 'Checkbox'},
];

export const selectClassName =
  'flex h-10 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function getFormFieldInputType(field: FormField): string {
  switch (field.type) {
    case 'email':
      return 'email';
    case 'number':
      return 'number';
    case 'tel':
      return 'tel';
    case 'url':
      return 'url';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}
