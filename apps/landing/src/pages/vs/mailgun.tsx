import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'mailgun',
  name: 'Mailgun',
  seo: {
    title: 'Mailgun Alternative with Marketing & Automation | Plunk',
    description:
      'Switching from Mailgun? Plunk is an open-source alternative with pay-as-you-go pricing, marketing campaigns, and workflow automation — no subscription tiers, no lock-in.',
    ogTitle: 'Mailgun Alternative with Marketing & Automation | Plunk',
    ogDescription:
      'Switching from Mailgun? Plunk is open-source with pay-as-you-go pricing, marketing campaigns, and workflow automation — no subscription tiers.',
    ogImageTitle: 'Mailgun Alternative: Open-Source with Marketing & Automation',
  },
  headline: (
    <>
      The Mailgun alternative
      <br />
      with campaigns included
    </>
  ),
  summary:
    'Mailgun sends transactional email on tiered monthly plans. Plunk sends it too, adds campaigns, workflows and segments on the same contacts, and bills per email with no tiers.',
  differences: [
    {
      kind: 'campaigns',
      title: 'Campaigns without a second tool',
      copy: 'Send one-time broadcasts to all contacts or a segment, and track how they perform. With Mailgun you need a separate marketing platform.',
    },
    {
      kind: 'workflows',
      title: 'Sequences with triggers and delays',
      copy: 'Build onboarding, drip and cart abandonment flows with triggers, delays and conditions. Mailgun has no workflow automation.',
    },
    {
      kind: 'pricing',
      title: 'No plan to upgrade as you grow',
      copy: 'Plunk bills each email you send, with no commitment. Mailgun sells tiered monthly plans that you move up as volume grows.',
    },
  ],
  choosePlunk: [
    'You send transactional and marketing email and want one tool for both',
    'Your sending volume changes from month to month',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You need advanced email validation',
    'You send millions of transactional emails a day',
    'You want a provider with a long track record and deep deliverability tooling',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: '100 emails/day'},
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Tiered monthly plans'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: false},
    {feature: 'Workflow automation', plunk: true, competitor: false},
    {feature: 'Dynamic segmentation', plunk: true, competitor: false},
    {feature: 'Email validation', plunk: 'Basic', competitor: 'Advanced'},
    {feature: 'Custom domains', plunk: true, competitor: true},
  ],
  faqs: [
    {
      question: 'When should I choose Mailgun over Plunk?',
      answer:
        'Choose Mailgun if you need advanced email validation features or have very high volume transactional email needs (millions per day) and want a proven infrastructure provider. Mailgun has been around longer and has extensive deliverability tools. Choose Plunk if you need marketing campaigns, workflow automation, or want the flexibility to self-host (though Plunk also offers fully-managed hosting).',
    },
    {
      question: 'What is the pricing difference between Plunk and Mailgun?',
      answer:
        "Plunk uses a simple pay-as-you-go pricing model where you pay only for emails sent. Mailgun uses tiered monthly plans based on email volume, which can be cost-effective at very high volumes but less flexible for variable sending patterns. With Plunk, you get marketing campaigns and workflow automation included at no additional cost - with Mailgun, you'd need separate tools for marketing.",
    },
    {
      question: 'Is migration from Mailgun to Plunk complex?',
      answer:
        "Migration requires updating your API integration since Plunk and Mailgun use different API structures. You'll need to update your code to use Plunk's endpoints and parameter format. Both platforms support similar core features (templates, webhooks, custom domains), so the concepts translate directly. Plan for a few hours of development work to migrate your integration. Your email templates can be adapted with minimal changes.",
    },
    {
      question: 'What does Plunk add beyond transactional emails?',
      answer:
        'Plunk adds marketing campaigns (one-time broadcasts to all contacts or specific segments), workflow automation (multi-step email sequences with triggers, delays, and conditions), and dynamic audience segmentation (auto-updating groups based on contact data and behavior). These features mean you can handle both transactional and marketing emails in one platform. Plunk is also open-source (AGPL-3.0) and self-hostable, giving you full control over your email infrastructure.',
    },
  ],
  cta: {title: 'Add campaigns and workflows to your transactional email.'},
};

export default function MailgunComparison() {
  return <ComparisonPage comparison={comparison} />;
}
