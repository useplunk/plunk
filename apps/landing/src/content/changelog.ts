import {WIKI_URI} from '../lib/constants';

/**
 * Everything worth announcing since Plunk Next launched, newest first.
 *
 * One source of truth for both the `/changelog` page and its markdown variant,
 * so the two can never disagree about what shipped. Dates are the day the work
 * landed on `next`, taken from git history.
 *
 * `major` entries carry a miniature of the real product surface; `minor`
 * entries carry a short machine tag instead (an endpoint, a header, an
 * operator). The tag is the at-a-glance version of the feature, so it should be
 * the literal thing a developer would type or see, not a category name.
 *
 * Copy rules, so a new entry reads like the rest:
 * - Title: names the capability in sentence case. No leading "A", no wordplay.
 * - Description: one or two sentences, active voice, present tense. Say what
 *   you can do or what Plunk now does, using the product's own nouns (contact,
 *   campaign, event, workflow step), not synonyms like "recipient".
 * - Numerals for quantities, serial comma, US spelling (except literals such
 *   as the `CANCELLED` status).
 * - Contact-facing pages are "unsubscribe and preference pages"; self-hosting
 *   entries say "self-hosted instances".
 */

export type ChangelogArtifact =
  | 'snooze'
  | 'mcp'
  | 'liquidEditor'
  | 'liquid'
  | 'tableFilter'
  | 'segmentFilter'
  | 'commandPalette'
  | 'onboarding'
  | 'branches'
  | 'inbound'
  | 'inlineImage'
  | 'preview'
  | 'locales'
  | 'security';

interface BaseEntry {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  title: string;
  description: string;
  /** Where to read more: a feature page or a docs page. */
  href?: string;
}

export type ChangelogEntry =
  | (BaseEntry & {kind: 'major'; artifact: ChangelogArtifact})
  | (BaseEntry & {kind: 'minor'; tag: string});

export const CHANGELOG: ChangelogEntry[] = [
  // September 2026
  {
    kind: 'minor',
    date: '2026-09-21',
    title: 'Plain text alternative on every email',
    description:
      'Plunk sends a plain text version alongside the HTML of every email, generated from your content. Spam filters score HTML-only messages more harshly, so this lifts deliverability without any change to your code.',
    href: `${WIKI_URI}/guides/list-hygiene#plain-text-alternative`,
    tag: 'text/plain',
  },
  {
    kind: 'major',
    date: '2026-09-11',
    title: 'Snooze instead of unsubscribing',
    description:
      'Contacts can pause your emails for 2 weeks, 1 month, 6 months, or 1 year instead of leaving for good. Plunk resubscribes them automatically when the snooze ends.',
    href: `${WIKI_URI}/concepts/contacts`,
    artifact: 'snooze',
  },
  {
    kind: 'minor',
    date: '2026-09-05',
    title: 'Archive campaigns',
    description: 'Hide campaigns and drafts you no longer need from the campaign list. Their stats are kept, and you can restore them.',
    tag: 'archived: true',
  },
  {
    kind: 'minor',
    date: '2026-08-30',
    title: 'Cancelled campaigns return to draft',
    description: 'Cancelling a campaign drops its unsent emails and turns it back into an editable draft.',
    tag: 'CANCELLED → DRAFT',
  },

  // August 2026
  {
    kind: 'major',
    date: '2026-08-17',
    title: 'MCP server',
    description:
      'Connect Claude, Cursor, or any MCP client to your project. Your agent can manage contacts, draft campaigns, and send email, and it asks you to confirm before sending a campaign.',
    href: '/features/mcp',
    artifact: 'mcp',
  },
  {
    kind: 'minor',
    date: '2026-08-21',
    title: 'Subscribe and unsubscribe events',
    description: 'Plunk tracks an event whenever a contact subscribes or unsubscribes, so workflows can trigger on it.',
    tag: 'contact.unsubscribed',
  },
  {
    kind: 'minor',
    date: '2026-08-13',
    title: 'API rate limits for self-hosted instances',
    description: 'Turn on rate limits, with burst allowances, for the track, send, and contact endpoints.',
    tag: 'RATE_LIMIT_ENABLED=true',
  },
  {
    kind: 'major',
    date: '2026-08-10',
    title: 'Liquid-aware template editor',
    description:
      'The editor flags Liquid syntax errors as you type, highlights logic tags, and inserts ready-made if, case, and for blocks from a menu.',
    href: `${WIKI_URI}/guides/template-language`,
    artifact: 'liquidEditor',
  },
  {
    kind: 'minor',
    date: '2026-08-09',
    title: 'One-click unsubscribe',
    description: 'Marketing emails include the RFC 8058 headers, so the unsubscribe button built into inboxes works without opening a page.',
    tag: 'List-Unsubscribe-Post',
  },
  {
    kind: 'minor',
    date: '2026-08-04',
    title: 'Insert steps anywhere in a workflow',
    description: 'Add a step between two existing steps, or disconnect and reconnect branches, without rebuilding the workflow.',
    tag: 'Insert Step',
  },
  {
    kind: 'minor',
    date: '2026-08-04',
    title: 'Swedish translations',
    description: 'Unsubscribe and preference pages are now available in Swedish.',
    tag: 'sv',
  },

  // July 2026
  {
    kind: 'major',
    date: '2026-07-26',
    title: 'Liquid templating',
    description:
      'Subjects and bodies render with LiquidJS, so templates get conditionals, loops, filters, and fallback values on top of plain variables.',
    href: `${WIKI_URI}/guides/template-language`,
    artifact: 'liquid',
  },
  {
    kind: 'minor',
    date: '2026-07-11',
    title: 'Headers per email type',
    description: 'Marketing, transactional, and headless emails each get only the standard headers their type calls for.',
    tag: 'Precedence: bulk',
  },
  {
    kind: 'minor',
    date: '2026-07-10',
    title: 'Idempotency keys for sends and events',
    description: 'Retry requests safely. A key reused within 24 hours is rejected, so the same email or event is never sent twice.',
    tag: 'Idempotency-Key',
  },
  {
    kind: 'minor',
    date: '2026-07-10',
    title: '90-day email body retention',
    description: 'Plunk deletes rendered email bodies after 90 days. Stats and activity are kept.',
    href: `${WIKI_URI}/guides/data-retention`,
    tag: 'RETENTION_DAYS = 90',
  },

  // June 2026
  {
    kind: 'major',
    date: '2026-06-11',
    title: 'Tables with filters and bulk actions',
    description:
      'Contacts, templates, campaigns, and workflows share one table with sorting, faceted filters, and bulk delete.',
    artifact: 'tableFilter',
  },
  {
    kind: 'minor',
    date: '2026-06-21',
    title: 'Japanese translations',
    description: 'Unsubscribe and preference pages are now available in Japanese.',
    tag: 'ja',
  },
  {
    kind: 'minor',
    date: '2026-06-15',
    title: 'Normalized contact emails',
    description: 'Differences in letter case or stray whitespace no longer create duplicate contacts.',
    tag: 'Ana@X.com → ana@x.com',
  },

  // May 2026
  {
    kind: 'major',
    date: '2026-05-04',
    title: 'Segments built from segments',
    description:
      'Filter on membership of another segment, or on events a contact has not triggered recently. A win-back audience takes 2 rules.',
    href: '/features/segments',
    artifact: 'segmentFilter',
  },
  {
    kind: 'minor',
    date: '2026-05-10',
    title: 'Variables in webhook steps',
    description: 'Use contact and event data in the URL, headers, and body of a workflow webhook step.',
    tag: 'POST /users/{{ contact.id }}',
  },
  {
    kind: 'minor',
    date: '2026-05-09',
    title: 'Duplicate a workflow',
    description: 'Copy a workflow with all its steps and branches, then edit the copy.',
    tag: 'Onboarding (Copy)',
  },
  {
    kind: 'minor',
    date: '2026-05-09',
    title: 'Change subscriptions from a workflow',
    description: 'The Update contact step can now subscribe or unsubscribe the contact.',
    tag: 'subscribed: false',
  },
  {
    kind: 'minor',
    date: '2026-05-06',
    title: 'Free email tools',
    description: 'Check SPF, DKIM, DMARC, and MX records, inspect email headers, or test an email for spam.',
    href: '/tools',
    tag: 'v=spf1 include:amazonses.com',
  },

  // April 2026
  {
    kind: 'major',
    date: '2026-04-24',
    title: 'Command palette',
    description: 'Jump to any page, recent item, or project from anywhere in the dashboard.',
    artifact: 'commandPalette',
  },
  {
    kind: 'major',
    date: '2026-04-19',
    title: 'Guided onboarding',
    description:
      'New projects start with a short checklist based on what you use Plunk for: campaigns, transactional email, or automations.',
    artifact: 'onboarding',
  },
  {
    kind: 'minor',
    date: '2026-04-29',
    title: 'Configurable attachment limits',
    description: 'Self-hosted instances can raise the attachment size and count, up to the 40 MB that SES allows.',
    tag: 'MAX_ATTACHMENT_SIZE_MB',
  },
  {
    kind: 'minor',
    date: '2026-04-13',
    title: 'Email IDs on webhook events',
    description: 'Delivery, open, and bounce events include the ID returned by the send request, so you can match each one to its email.',
    tag: 'emailId',
  },
  {
    kind: 'minor',
    date: '2026-04-02',
    title: 'Headless templates',
    description: 'Send your own HTML without the Plunk footer. Unsubscribed contacts are still skipped.',
    href: `${WIKI_URI}/concepts/templates`,
    tag: 'type: HEADLESS',
  },

  // March 2026
  {
    kind: 'major',
    date: '2026-03-11',
    title: 'Multi-branch conditions',
    description:
      'A condition step can split into as many branches as you need, like a switch statement, with a default branch for everything else.',
    href: '/features/workflows',
    artifact: 'branches',
  },
  {
    kind: 'minor',
    date: '2026-03-24',
    title: 'Chinese translations',
    description: 'Unsubscribe and preference pages are now available in Simplified, Traditional, and Hong Kong Chinese.',
    tag: 'zh-CN  zh-TW  zh-HK',
  },
  {
    kind: 'minor',
    date: '2026-03-18',
    title: 'Italian translations',
    description: 'Unsubscribe and preference pages are now available in Italian.',
    tag: 'it',
  },

  // February 2026
  {
    kind: 'major',
    date: '2026-02-17',
    title: 'Inbound email',
    description:
      'Receive email at any address on your domain. Senders are added as contacts, and every message triggers an event and a webhook.',
    href: '/features/inbound-email',
    artifact: 'inbound',
  },
  {
    kind: 'minor',
    date: '2026-02-23',
    title: 'Static segments',
    description: 'Add contacts to a segment by hand. Its members only change when you change them.',
    tag: 'type: STATIC',
  },
  {
    kind: 'minor',
    date: '2026-02-18',
    title: 'Change a workflow trigger',
    description: 'Switch an existing workflow to a different trigger event without rebuilding it.',
    tag: 'trigger: user.upgraded',
  },
  {
    kind: 'minor',
    date: '2026-02-17',
    title: 'Custom recipients in workflows',
    description: 'Send a workflow email to your team or any other address, not only the contact.',
    tag: 'to: team@yourdomain.com',
  },
  {
    kind: 'minor',
    date: '2026-02-19',
    title: 'Spanish, Polish, and Czech translations',
    description: 'Unsubscribe and preference pages are now available in Spanish, Polish, and Czech.',
    tag: 'es  pl  cs',
  },

  // January 2026
  {
    kind: 'major',
    date: '2026-01-31',
    title: 'Inline images',
    description: 'Attach an image with a Content-ID and reference it from your HTML. It appears in the email body instead of as an attachment.',
    href: `${WIKI_URI}/api-reference/public-api/sendEmail`,
    artifact: 'inlineImage',
  },
  {
    kind: 'minor',
    date: '2026-01-21',
    title: 'Bounce and complaint filters',
    description: 'Filter the activity feed to bounces and complaints, the events that affect your sending reputation.',
    tag: 'email.bounced',
  },
  {
    kind: 'minor',
    date: '2026-01-12',
    title: 'Older-than segment filter',
    description: 'Match contacts whose date field is more than a set number of days, weeks, or months in the past.',
    tag: 'olderThan 30 days',
  },
  {
    kind: 'minor',
    date: '2026-01-12',
    title: 'Disable signups on self-hosted instances',
    description: 'Block new account signups so only existing users can sign in.',
    tag: 'DISABLE_SIGNUPS=true',
  },
  {
    kind: 'minor',
    date: '2026-01-15',
    title: 'Portuguese and Bulgarian translations',
    description: 'Unsubscribe and preference pages are now available in Portuguese and Bulgarian.',
    tag: 'pt  bg',
  },

  // December 2025
  {
    kind: 'major',
    date: '2025-12-29',
    title: 'Email previews in activity',
    description: "Open any sent email from a contact's page or the activity feed to see exactly what they received.",
    artifact: 'preview',
  },
  {
    kind: 'minor',
    date: '2025-12-24',
    title: 'Email verification endpoint',
    description: 'Check an address for valid syntax, disposable domains, plus-addressing, and MX records before you add it.',
    href: `${WIKI_URI}/api-reference/public-api/verifyEmail`,
    tag: 'POST /v1/verify',
  },
  {
    kind: 'major',
    date: '2025-12-21',
    title: 'Translated unsubscribe and preference pages',
    description:
      'Set a language per project, or per contact with a locale field, and these pages follow it. Plunk supports 16 languages today.',
    artifact: 'locales',
  },
  {
    kind: 'minor',
    date: '2025-12-18',
    title: 'Bulk actions on contacts',
    description: 'Select contacts across pages, or every contact at once, then subscribe, unsubscribe, or delete them together.',
    tag: 'Select all 12,480',
  },
  {
    kind: 'major',
    date: '2025-12-11',
    title: 'Security center',
    description:
      "See your project's bounce and complaint rates next to Plunk's thresholds, with a warning well before a rate is high enough to disable the project.",
    artifact: 'security',
  },
  {
    kind: 'minor',
    date: '2025-12-10',
    title: 'Campaigns from templates or past campaigns',
    description: 'Start a campaign from a template, or duplicate a campaign you already sent.',
    tag: 'Duplicate campaign',
  },
  {
    kind: 'minor',
    date: '2025-12-09',
    title: 'HTML code editor',
    description: 'Hand-written HTML templates open in a CodeMirror editor with syntax highlighting and code folding.',
    tag: '<table role="presentation">',
  },
];

/** Entries grouped by calendar month, newest month first, newest entry first. */
export function groupByMonth(entries: ChangelogEntry[]) {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const groups: {key: string; label: string; entries: ChangelogEntry[]}[] = [];

  for (const entry of sorted) {
    const key = entry.date.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const [year, month] = key.split('-').map(Number);
      const label = new Date(Date.UTC(year!, month! - 1, 1)).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
      group = {key, label, entries: []};
      groups.push(group);
    }
    group.entries.push(entry);
  }

  return groups;
}

/** `2026-09-11` → `Sep 11`. */
export function formatDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
