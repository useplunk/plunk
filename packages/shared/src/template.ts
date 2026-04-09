/**
 * Render email template by replacing variables
 * Supports {{variable}} and {{variable ?? defaultValue}} syntax
 * Also supports nested access like {{data.firstName}}
 *
 * Example:
 * renderTemplate('Hello {{name}}!', { name: 'World' }) -> 'Hello World!'
 * renderTemplate('Hello {{data.name}}!', { data: { name: 'World' } }) -> 'Hello World!'
 * renderTemplate('Hello {{name ?? Guest}}!', {}) -> 'Hello Guest!'
 */
export function renderTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const [mainKey, defaultValue] = key.split('??').map((s: string) => s.trim());

    // Handle nested property access (e.g., data.firstName)
    // Uses recursive first-dot splitting so that literal dots in custom field
    // names (e.g., "prefix.key") are resolved correctly: direct key lookup is
    // tried before descending into nested objects.
    const getValue = (obj: Record<string, unknown>, path: string): unknown => {
      if (path in obj) {
        return obj[path];
      }
      const firstDotIndex = path.indexOf('.');
      if (firstDotIndex === -1) {
        return undefined;
      }
      const firstKey = path.substring(0, firstDotIndex);
      const rest = path.substring(firstDotIndex + 1);
      const next = obj[firstKey];
      if (next && typeof next === 'object' && !Array.isArray(next)) {
        return getValue(next as Record<string, unknown>, rest);
      }
      return undefined;
    };

    // Try multiple lookup strategies
    const value =
      getValue(variables, mainKey) || // Try as nested path (e.g., data.firstName)
      variables[mainKey] || // Try as top-level property
      (variables.data as Record<string, unknown>)?.[mainKey]; // Try in data object

    // Handle array values (for lists)
    if (Array.isArray(value)) {
      return value.map((e: string) => `<li>${e}</li>`).join('\n');
    }

    return value ?? defaultValue ?? '';
  });
}