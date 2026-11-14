/**
 * The "X alternatives" pages. Each tool is described once here so every list
 * it appears in says the same thing about it. Descriptions stay at the level
 * of focus and pricing model, which change rarely; exact prices live on the
 * /vs pages, where they are dated.
 */

export type ToolKey =
  | 'plunk'
  | 'resend'
  | 'postmark'
  | 'mailgun'
  | 'sendgrid'
  | 'amazon-ses'
  | 'usesend'
  | 'loops'
  | 'customerio'
  | 'bento'
  | 'brevo'
  | 'mailerlite'
  | 'kit'
  | 'mailchimp'
  | 'mailjet'
  | 'buttondown'
  | 'activecampaign';

export interface Tool {
  name: string;
  /** The /vs page, when there is one. */
  vs?: string;
  category: string;
  bestFor: string;
  pricing: string;
  /** Company based in the EU, or for Plunk, data hosted in the EU. */
  eu?: boolean;
}

export const TOOLS: Record<ToolKey, Tool> = {
  'plunk': {
    name: 'Plunk',
    category: 'Open-source email platform',
    bestFor: 'Transactional email, campaigns and workflows on one contact list, open source and hosted in the EU.',
    pricing: '$0.001 per email, unlimited contacts',
    eu: true,
  },
  'resend': {
    name: 'Resend',
    vs: 'resend',
    category: 'Email API',
    bestFor: 'Developers who build emails with React Email and mostly send transactional email.',
    pricing: 'Monthly plans; marketing priced per contact',
  },
  'postmark': {
    name: 'Postmark',
    vs: 'postmark',
    category: 'Transactional email',
    bestFor: 'Transactional email with message streams kept strictly separate.',
    pricing: 'Monthly plans by email volume',
  },
  'mailgun': {
    name: 'Mailgun',
    vs: 'mailgun',
    category: 'Email API',
    bestFor: 'High-volume sending with email validation and deliverability tooling.',
    pricing: 'Monthly plans by email volume',
  },
  'sendgrid': {
    name: 'SendGrid',
    vs: 'sendgrid',
    category: 'Email API and marketing',
    bestFor: 'Large teams already using Twilio for other messaging.',
    pricing: 'Monthly plans by email volume',
  },
  'amazon-ses': {
    name: 'Amazon SES',
    vs: 'amazon-ses',
    category: 'Sending infrastructure',
    bestFor: 'Teams that will build contacts, templates and tracking themselves.',
    pricing: 'From $0.10 per 1,000 emails',
  },
  'usesend': {
    name: 'useSend',
    vs: 'usesend',
    category: 'Open-source email API',
    bestFor: 'Open source with low-cost transactional sending at volume.',
    pricing: 'Per email, with a $10 monthly minimum',
  },
  'loops': {
    name: 'Loops',
    vs: 'loops',
    category: 'Email for SaaS',
    bestFor: 'SaaS marketing teams that want a polished hosted tool.',
    pricing: 'Monthly plans by contacts',
  },
  'customerio': {
    name: 'Customer.io',
    vs: 'customerio',
    category: 'Messaging automation',
    bestFor: 'Journeys across email, SMS, push and in-app messages.',
    pricing: 'Monthly plans by profiles',
  },
  'bento': {
    name: 'Bento',
    vs: 'bento',
    category: 'Email marketing and automation',
    bestFor: 'Small SaaS and e-commerce teams that want marketing and automation together.',
    pricing: 'Monthly plans by subscribers',
  },
  'brevo': {
    name: 'Brevo',
    vs: 'brevo',
    category: 'Marketing suite',
    bestFor: 'Email, SMS, chat and a CRM in one suite.',
    pricing: 'Monthly plans by email volume',
    eu: true,
  },
  'mailerlite': {
    name: 'MailerLite',
    vs: 'mailerlite',
    category: 'Newsletters and marketing',
    bestFor: 'Newsletters with landing pages and forms, at a low price for small lists.',
    pricing: 'Monthly plans by subscribers',
    eu: true,
  },
  'kit': {
    name: 'Kit (formerly ConvertKit)',
    vs: 'convertkit',
    category: 'Email for creators',
    bestFor: 'Creators selling to an audience, with landing pages and commerce.',
    pricing: 'Monthly plans by subscribers',
  },
  'mailchimp': {
    name: 'Mailchimp',
    vs: 'mailchimp',
    category: 'Marketing platform',
    bestFor: 'Marketing teams that want drag-and-drop design and a large template library.',
    pricing: 'Monthly plans by contacts',
  },
  'mailjet': {
    name: 'Mailjet',
    vs: 'mailjet',
    category: 'Email API and newsletters',
    bestFor: 'Teams that want collaborative newsletter editing alongside an API.',
    pricing: 'Monthly plans by email volume',
    eu: true,
  },
  'buttondown': {
    name: 'Buttondown',
    vs: 'buttondown',
    category: 'Newsletters',
    bestFor: 'Writers who want a minimal, Markdown-first newsletter tool.',
    pricing: 'Monthly plans by subscribers',
  },
  'activecampaign': {
    name: 'ActiveCampaign',
    vs: 'activecampaign',
    category: 'Marketing automation and CRM',
    bestFor: 'Sales and marketing teams that want automation tied to a CRM.',
    pricing: 'Monthly plans by contacts',
  },
};

export interface AlternativesPage {
  slug: string;
  /** The tool people are leaving, as they write their own name. */
  name: string;
  /** One sentence for the hero. */
  intro: string;
  /** Why people look elsewhere, three short reasons. */
  reasons: {title: string; copy: string}[];
  /** Plunk first, then the rest, best fit first. */
  picks: ToolKey[];
  faqs: {question: string; answer: string}[];
}

export const ALTERNATIVES_UPDATED = 'October 2026';

export const ALTERNATIVES: AlternativesPage[] = [
  {
    slug: 'resend',
    name: 'Resend',
    intro:
      'Resend is a developer favourite for transactional email. Teams look elsewhere when marketing email, priced per contact, becomes the bigger bill, or when they need open source or EU hosting.',
    reasons: [
      {title: 'Marketing priced per contact', copy: 'Broadcasts are billed by how many contacts you store, on top of the transactional plan.'},
      {title: 'Two plans to size', copy: 'Transactional and marketing volume are planned and billed separately.'},
      {title: 'Closed source', copy: 'You cannot read the code or run it on your own servers.'},
    ],
    picks: ['plunk', 'postmark', 'usesend', 'mailgun', 'amazon-ses', 'loops'],
    faqs: [
      {
        question: 'What is the best alternative to Resend?',
        answer:
          'For transactional and marketing email on one bill with unlimited contacts, Plunk. For transactional email only, Postmark. For another open-source option on Amazon SES, useSend. For the lowest raw price, Amazon SES itself.',
      },
      {
        question: 'Is there an open-source alternative to Resend?',
        answer:
          'Plunk and useSend are both open source under AGPL-3.0 and can be self-hosted. Plunk also includes campaigns, workflows and segments.',
      },
      {
        question: 'Is there a European alternative to Resend?',
        answer:
          'Plunk Cloud stores contacts and email history in Germany and includes a DPA. Brevo and Mailjet are EU companies, focused more on marketing than on a developer API.',
      },
    ],
  },
  {
    slug: 'sendgrid',
    name: 'SendGrid',
    intro:
      'SendGrid is one of the oldest email APIs. Teams leave over plan pricing, a dashboard that has grown complex, and support that is hard to reach on smaller plans.',
    reasons: [
      {title: 'Tiered plans', copy: 'You pay for a monthly volume tier, used or not, with separate marketing plans.'},
      {title: 'Complex to run', copy: 'Years of features make setup and the dashboard heavier than newer tools.'},
      {title: 'Closed source', copy: 'You cannot read the code or run it on your own servers.'},
    ],
    picks: ['plunk', 'postmark', 'mailgun', 'resend', 'amazon-ses', 'brevo'],
    faqs: [
      {
        question: 'What is the best alternative to SendGrid?',
        answer:
          'For transactional and marketing email together at $0.001 per email, Plunk. For transactional email only, Postmark or Resend. For high volume with validation tools, Mailgun. For the lowest raw price, Amazon SES.',
      },
      {
        question: 'Is there a free alternative to SendGrid?',
        answer:
          'Plunk has a free plan with 1,000 emails a month and is open source, so you can self-host it for the cost of your server and Amazon SES. Resend and Brevo also have free tiers.',
      },
      {
        question: 'How hard is it to move off SendGrid?',
        answer:
          'Verify your domain with the new provider, change your send calls or SMTP credentials, and import your contacts and suppression list. Apps that send over SMTP often only need new credentials.',
      },
    ],
  },
  {
    slug: 'mailgun',
    name: 'Mailgun',
    intro:
      'Mailgun is a long-standing email API built for volume. Teams look elsewhere when they also need campaigns and automation, or want to stop paying for a monthly tier they do not fill.',
    reasons: [
      {title: 'Tiered monthly plans', copy: 'You pay for a volume tier each month, used or not, and move up as you grow.'},
      {title: 'Sending only', copy: 'Campaigns, workflows and segments need a second tool alongside it.'},
      {title: 'Closed source', copy: 'You cannot read the code or run it on your own servers.'},
    ],
    picks: ['plunk', 'postmark', 'resend', 'sendgrid', 'amazon-ses', 'usesend'],
    faqs: [
      {
        question: 'What is the best alternative to Mailgun?',
        answer:
          'For transactional and marketing email together at $0.001 per email, Plunk. For transactional email only, Postmark or Resend. For a similar volume-focused API, SendGrid. For the lowest raw price, Amazon SES.',
      },
      {
        question: 'Is there a free alternative to Mailgun?',
        answer:
          'Plunk has a free plan with 1,000 emails a month and is open source, so you can also self-host it for the cost of your server and Amazon SES. Resend also has a free tier.',
      },
      {
        question: 'Is there a European alternative to Mailgun?',
        answer:
          'Plunk Cloud stores contacts and email history in Germany and includes a DPA. Mailgun itself offers an EU region; Brevo and Mailjet are EU companies focused more on marketing.',
      },
    ],
  },
  {
    slug: 'mailchimp',
    name: 'Mailchimp',
    intro:
      'Mailchimp is the best-known marketing email tool. Product teams leave because pricing grows with contacts, and because transactional email is a paid add-on, Mailchimp Transactional.',
    reasons: [
      {title: 'Priced by contacts', copy: 'Your bill grows with your list, even contacts you rarely email.'},
      {title: 'Transactional is an add-on', copy: 'Receipts and password resets need Mailchimp Transactional, billed separately on Standard plans and up.'},
      {title: 'Built for marketers', copy: 'Product events and developer workflows are an afterthought.'},
    ],
    picks: ['plunk', 'mailerlite', 'brevo', 'kit', 'loops', 'buttondown'],
    faqs: [
      {
        question: 'What is the best alternative to Mailchimp?',
        answer:
          'For product teams that send transactional and marketing email, Plunk. For newsletters on a budget, MailerLite. For creators, Kit. For an all-in-one suite with a CRM, Brevo.',
      },
      {
        question: 'Is there a Mailchimp alternative that is not priced per contact?',
        answer:
          'Plunk charges per email with unlimited contacts. Brevo also prices by email volume rather than list size.',
      },
      {
        question: 'Is there a European alternative to Mailchimp?',
        answer:
          'Plunk Cloud stores data in Germany. Brevo and MailerLite are EU-based marketing tools.',
      },
    ],
  },
  {
    slug: 'loops',
    name: 'Loops',
    intro:
      'Loops is built for SaaS email and is pleasant to use. Teams look elsewhere when contact-based pricing outgrows their sending, or when they need open source or EU hosting.',
    reasons: [
      {title: 'Priced by contacts', copy: 'Plans grow with your contact list, not with how much you send.'},
      {title: 'Closed source', copy: 'You cannot read the code or run it on your own servers.'},
      {title: 'Hosted in one place', copy: 'There is no option to keep data on your own infrastructure.'},
    ],
    picks: ['plunk', 'customerio', 'bento', 'resend', 'mailerlite'],
    faqs: [
      {
        question: 'What is the best alternative to Loops?',
        answer:
          'For the same mix of transactional, campaigns and workflows priced per email, Plunk. For multi-channel journeys, Customer.io. For marketing and automation for small teams, Bento.',
      },
      {
        question: 'Is there a cheaper alternative to Loops?',
        answer:
          'If you have a large list and send to it occasionally, per-email pricing usually costs less. Plunk charges $0.001 per email with unlimited contacts.',
      },
      {
        question: 'Is there an open-source alternative to Loops?',
        answer: 'Plunk is open source under AGPL-3.0 and covers the same ground: transactional email, campaigns and workflows.',
      },
    ],
  },
  {
    slug: 'postmark',
    name: 'Postmark',
    intro:
      'Postmark has a strong reputation for transactional delivery. Teams look elsewhere when they also need marketing email and automation, or want to pay per email instead of per plan.',
    reasons: [
      {title: 'Transactional first', copy: 'Broadcasts go out through the API, with no campaign builder, workflows or segments.'},
      {title: 'Monthly plans', copy: 'You pay for a volume tier each month, used or not.'},
      {title: 'Closed source', copy: 'You cannot read the code or run it on your own servers.'},
    ],
    picks: ['plunk', 'resend', 'mailgun', 'sendgrid', 'amazon-ses', 'usesend'],
    faqs: [
      {
        question: 'What is the best alternative to Postmark?',
        answer:
          'For transactional email plus campaigns and workflows, Plunk. For a developer-first transactional API, Resend. For high volume, Mailgun. For the lowest raw price, Amazon SES.',
      },
      {
        question: 'Is there a cheaper alternative to Postmark?',
        answer:
          'Plunk charges $0.001 per email with no monthly plan, so low and uneven volumes cost less. At very high volume, Amazon SES is cheapest if you build the rest yourself.',
      },
      {
        question: 'Is there an open-source alternative to Postmark?',
        answer: 'Plunk and useSend are open source under AGPL-3.0, and both send through Amazon SES.',
      },
    ],
  },
  {
    slug: 'customerio',
    name: 'Customer.io',
    intro:
      'Customer.io is powerful messaging automation. Smaller teams look elsewhere when the price and the setup outweigh what they use, especially if email is the only channel they need.',
    reasons: [
      {title: 'Priced for larger teams', copy: 'Plans start well above what an early-stage product sends.'},
      {title: 'A lot to set up', copy: 'Journeys, objects and data pipelines take time to learn and maintain.'},
      {title: 'Closed source', copy: 'You cannot read the code or run it on your own servers.'},
    ],
    picks: ['plunk', 'loops', 'bento', 'brevo', 'activecampaign'],
    faqs: [
      {
        question: 'What is the best alternative to Customer.io?',
        answer:
          'For event-triggered email workflows at $0.001 per email, Plunk. For SaaS marketing in a polished tool, Loops. For small teams, Bento. If you need a CRM, ActiveCampaign.',
      },
      {
        question: 'Is there a cheaper alternative to Customer.io?',
        answer:
          'If email is your only channel, Plunk covers event-triggered workflows, segments, campaigns and transactional email, billed per email with unlimited contacts.',
      },
      {
        question: 'Is there an open-source alternative to Customer.io?',
        answer: 'Plunk is open source under AGPL-3.0, with event-triggered workflows, delays, conditions and webhooks.',
      },
    ],
  },
];

export function getAlternativesPage(slug: string): AlternativesPage | undefined {
  return ALTERNATIVES.find(page => page.slug === slug);
}
