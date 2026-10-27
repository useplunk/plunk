/**
 * Detects whether an email body contains an unsubscribe signal.
 *
 * Used to warn authors of HEADLESS emails that no unsubscribe mechanism
 * was found — Plunk cannot verify the link works, but can check for common patterns.
 *
 * Returns true if any of the following are present:
 * - Plunk template variables: {{unsubscribeUrl}} or {{manageUrl}}
 * - An <a> tag whose href contains unsubscribe-related keywords
 * - An <a> tag whose visible text contains unsubscribe-related keywords
 */
export function detectUnsubscribeSignal(body: string): boolean {
  if (!body) return false;

  // Plunk's own managed unsubscribe variables, in any spacing Liquid accepts
  // ({{unsubscribeUrl}}, {{ manageUrl }}, {{- unsubscribeUrl -}}, with or without filters)
  if (/\{\{-?\s*(?:unsubscribeUrl|manageUrl)\b[^}]*\}\}/.test(body)) return true;

  // href containing unsubscribe keywords
  if (/href=["'][^"']*(?:unsubscribe|opt[_-]?out|remove)[^"']*["']/i.test(body)) return true;

  // Anchor text containing unsubscribe keywords
  if (/<a\b[^>]*>(?:[^<]*(?:unsubscribe|opt[_-]?\s*out|manage\s+preferences|email\s+preferences|remove\s+me)[^<]*)<\/a>/i.test(body))
    return true;

  return false;
}
