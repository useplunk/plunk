/**
 * Every guide, in the order the index lists them. The index, the related
 * guides at the end of each page and the breadcrumb all read from here, so a
 * guide's short title and category are written once.
 */

export type GuideCategory = 'Authentication' | 'Deliverability' | 'Engagement' | 'Fundamentals' | 'Migration';

export interface GuideInfo {
  slug: string;
  /** The short name used in lists and breadcrumbs, not the SEO title. */
  name: string;
  description: string;
  category: GuideCategory;
  /** The free tool that does what the guide explains, if there is one. */
  tool?: {slug: string; name: string; pitch: string};
}

export const GUIDE_CATEGORIES: {name: GuideCategory; description: string}[] = [
  {name: 'Authentication', description: 'The three DNS records that prove your mail is yours.'},
  {name: 'Deliverability', description: 'What decides whether mail lands in the inbox.'},
  {name: 'Engagement', description: 'Opens, clicks and the habits behind them.'},
  {name: 'Fundamentals', description: 'How email for products is sent and classified.'},
  {name: 'Migration', description: 'Moving to Plunk from another email tool, step by step.'},
];

export const GUIDES: GuideInfo[] = [
  {
    slug: 'what-is-spf',
    name: 'What is SPF?',
    description: 'How SPF lists the servers allowed to send for your domain.',
    category: 'Authentication',
    tool: {slug: 'spf-checker', name: 'SPF checker', pitch: 'Look up a domain’s SPF record and count its DNS lookups.'},
  },
  {
    slug: 'what-is-dkim',
    name: 'What is DKIM?',
    description: 'How a DKIM signature proves a message was not changed.',
    category: 'Authentication',
    tool: {slug: 'dkim-checker', name: 'DKIM checker', pitch: 'Find a DKIM key by selector and check it is valid.'},
  },
  {
    slug: 'what-is-dmarc',
    name: 'What is DMARC?',
    description: 'How DMARC tells inboxes what to do when SPF and DKIM fail.',
    category: 'Authentication',
    tool: {slug: 'dmarc-checker', name: 'DMARC checker', pitch: 'Check a DMARC policy and how close it is to enforcement.'},
  },
  {
    slug: 'email-deliverability',
    name: 'Email deliverability',
    description: 'The factors that decide inbox or spam, and how to fix each one.',
    category: 'Deliverability',
    tool: {slug: 'spam-checker', name: 'Spam checker', pitch: 'Test a subject and body for spam triggers before you send.'},
  },
  {
    slug: 'email-bounce-rate',
    name: 'Email bounce rate',
    description: 'Hard and soft bounces, what causes them and how to keep the rate low.',
    category: 'Deliverability',
    tool: {slug: 'verify-email', name: 'Email verification', pitch: 'Catch typos and dead domains before they bounce.'},
  },
  {
    slug: 'email-sender-reputation',
    name: 'Sender reputation',
    description: 'How inboxes score your domain, and how to build and repair that score.',
    category: 'Deliverability',
    tool: {slug: 'dmarc-checker', name: 'DMARC checker', pitch: 'Check the record inboxes use to trust your domain.'},
  },
  {
    slug: 'email-open-rate',
    name: 'Email open rate',
    description: 'Benchmarks by industry, what moves the number and what Apple broke.',
    category: 'Engagement',
  },
  {
    slug: 'email-click-through-rate',
    name: 'Email click-through rate',
    description: 'Benchmarks, and the changes that get more people to click.',
    category: 'Engagement',
  },
  {
    slug: 'email-marketing-best-practices',
    name: 'Email marketing best practices',
    description: 'List building, content, timing, testing and the law, in one place.',
    category: 'Engagement',
    tool: {slug: 'spam-checker', name: 'Spam checker', pitch: 'Test a subject and body for spam triggers before you send.'},
  },
  {
    slug: 'transactional-vs-marketing-email',
    name: 'Transactional vs marketing email',
    description: 'Which is which, why it matters legally, and how to send each.',
    category: 'Fundamentals',
  },
  {
    slug: 'email-api-guide',
    name: 'Email API guide',
    description: 'How email APIs work, with examples, features and what to look for.',
    category: 'Fundamentals',
    tool: {slug: 'email-headers', name: 'Email headers analyzer', pitch: 'Trace a message’s route and authentication results.'},
  },  {
    slug: 'migrate-from-resend',
    name: 'Migrate from Resend',
    description: 'Move domains, contacts, templates and sending code from Resend.',
    category: 'Migration',
    tool: {slug: 'dkim-checker', name: 'DKIM checker', pitch: 'Confirm your new DKIM records are live before you switch.'},
  },
  {
    slug: 'migrate-from-sendgrid',
    name: 'Migrate from SendGrid',
    description: 'Move domains, contacts, suppressions and sending code from SendGrid.',
    category: 'Migration',
    tool: {slug: 'dkim-checker', name: 'DKIM checker', pitch: 'Confirm your new DKIM records are live before you switch.'},
  },
  {
    slug: 'migrate-from-mailchimp',
    name: 'Migrate from Mailchimp',
    description: 'Move your audience, unsubscribes and templates from Mailchimp.',
    category: 'Migration',
    tool: {slug: 'dkim-checker', name: 'DKIM checker', pitch: 'Confirm your new DKIM records are live before you switch.'},
  },
  {
    slug: 'migrate-from-loops',
    name: 'Migrate from Loops',
    description: 'Move contacts, events, loops and transactional emails from Loops.',
    category: 'Migration',
    tool: {slug: 'dkim-checker', name: 'DKIM checker', pitch: 'Confirm your new DKIM records are live before you switch.'},
  },
];

export function getGuide(slug: string): GuideInfo {
  const guide = GUIDES.find(g => g.slug === slug);
  if (!guide) throw new Error(`Unknown guide: ${slug}`);
  return guide;
}

/** Same category first, then the rest, three in all. */
export function relatedGuides(slug: string): GuideInfo[] {
  const current = getGuide(slug);
  const others = GUIDES.filter(g => g.slug !== slug);
  return [...others.filter(g => g.category === current.category), ...others.filter(g => g.category !== current.category)].slice(
    0,
    3,
  );
}
