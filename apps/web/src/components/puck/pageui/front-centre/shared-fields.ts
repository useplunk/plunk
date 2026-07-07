export const yesNo = (label: string) =>
  ({
    type: 'radio',
    label,
    options: [
      {label: 'Yes', value: true},
      {label: 'No', value: false},
    ],
  }) as const;

export const sectionIdField = {
  type: 'text',
  label: 'Section ID (anchor link)',
} as const;

export function normalizeSectionId(id?: string): string | undefined {
  const trimmed = id?.trim().replace(/^#/, '');
  return trimmed || undefined;
}
