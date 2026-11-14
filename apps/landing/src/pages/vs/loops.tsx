import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'loops',
  name: 'Loops',
  seo: {
    title: 'Loops Alternative: Open Source & Self-Hostable | Plunk',
    description:
      'Need more control than Loops offers? Plunk is open-source and self-hostable with pay-as-you-go pricing, no contact limits, and full code transparency.',
    ogTitle: 'Loops Alternative: Open Source & Self-Hostable | Plunk',
    ogDescription:
      'Need more control than Loops offers? Plunk is open-source and self-hostable with pay-as-you-go pricing and no contact limits.',
    ogImageTitle: 'Loops Alternative: Open Source & Self-Hostable',
  },
  headline: (
    <>
      The Loops alternative
      <br />
      that is open source
    </>
  ),
  summary:
    'Loops is a proprietary email platform with a free tier and monthly plans capped by contacts. Plunk covers the same ground (transactional email, campaigns, workflows, segments) but is open source, has no contact limits, and charges $0.001 per email.',
  differences: [
    {
      kind: 'ownership',
      title: 'Open source, cloud or self-hosted',
      copy: 'Plunk is AGPL-3.0 licensed. Use the hosted cloud or run it on your own servers with Docker. Loops is cloud-only.',
    },
    {
      kind: 'pricing',
      title: 'No contact limits',
      copy: 'Loops prices its tiers by contact count. Plunk stores unlimited contacts and charges $0.001 per email sent.',
    },
    {
      kind: 'eu',
      title: 'Hosted in the EU',
      copy: 'Plunk Cloud stores contacts and email history in Germany, with a DPA included. Or keep everything on your own servers.',
    },
  ],
  choosePlunk: [
    'You want to read the code that sends your email',
    'You want the option to run it on your own servers',
    'You have a large or fast-growing contact list',
  ],
  chooseThem: [
    'You prefer a fixed monthly subscription',
    'Your contact list fits comfortably within a tier',
    'Your team wants a tool built only for SaaS marketing',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Monthly subscription tiers'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Contact limits', plunk: 'Unlimited', competitor: 'Tier-based limits'},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: true},
    {feature: 'Dynamic segmentation', plunk: true, competitor: true},
    {feature: 'API access', plunk: true, competitor: true},
  ],
  faqs: [
    {
      question: 'What is the main difference between Plunk and Loops?',
      answer:
        'Plunk is open-source (AGPL-3.0) and self-hostable, while Loops is a proprietary SaaS platform. Plunk uses pay-as-you-go pricing with no contact limits, whereas Loops uses subscription tiers with contact-based limits. Both offer similar features, but Plunk gives you full transparency and control.',
    },
    {
      question: 'Is Plunk cheaper than Loops?',
      answer:
        "It depends on your usage. Plunk's pay-as-you-go model ($0.001 per email) means you only pay for what you send. Loops charges monthly subscriptions based on contact count. For businesses with variable email volume or growing contact lists, Plunk is often more cost-effective.",
    },
    {
      question: 'Can I self-host Plunk unlike Loops?',
      answer:
        'Yes. Plunk is open-source and can be self-hosted using Docker. This gives you full control over your data, infrastructure, and costs. Loops is cloud-only with no self-hosting option.',
    },
    {
      question: 'Does Plunk have the same modern features as Loops?',
      answer:
        'Yes. Plunk offers transactional emails, marketing campaigns, workflow automation, dynamic segmentation, and a modern API, just like Loops. The key difference is Plunk is open-source, self-hostable, and has no contact limits.',
    },
    {
      question: 'How easy is it to migrate from Loops to Plunk?',
      answer:
        "Migration is straightforward. Export your contacts from Loops, import them to Plunk via CSV, and update your application to use Plunk's API. Most migrations can be completed in a few hours.",
    },
  ],
  cta: {title: 'Keep the features, drop the contact limits.'},
};

export default function LoopsComparison() {
  return <ComparisonPage comparison={comparison} />;
}
