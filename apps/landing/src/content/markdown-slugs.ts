export const MARKDOWN_SLUGS: ReadonlySet<string> = new Set([
  'index',
  'pricing',
  'features/workflows',
  'features/segments',
  'features/inbound-email',
  'features/email-editor',
  'features/smtp',
  'features/mcp',
]);

export function hasMarkdownVariant(pathname: string): boolean {
  const slug = pathname.replace(/^\/+|\/+$/g, '') || 'index';
  return MARKDOWN_SLUGS.has(slug);
}
