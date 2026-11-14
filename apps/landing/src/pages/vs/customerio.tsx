import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'customerio',
  name: 'Customer.io',
  seo: {
    title: 'Customer.io Alternative: Open-Source & Developer-Focused | Plunk',
    description:
      "Frustrated with Customer.io's complexity and cost? Plunk is an open-source alternative with simple workflow automation, transparent pay-as-you-go pricing, and no CRM overhead.",
    ogTitle: 'Customer.io Alternative: Open-Source & Developer-Focused | Plunk',
    ogDescription:
      "Frustrated with Customer.io's complexity and cost? Plunk is open-source with simple workflow automation and transparent pay-as-you-go pricing.",
    ogImageTitle: 'Customer.io Alternative: Open-Source & Developer-Focused',
  },
  headline: (
    <>
      The Customer.io alternative
      <br />
      live in five minutes
    </>
  ),
  summary:
    'Customer.io is marketing automation for teams with dedicated marketing operations, priced on profiles, messages and feature tiers. Plunk runs event-driven workflows too, bills per email sent, and you can be sending within minutes of signing up.',
  differences: [
    {
      kind: 'setup',
      title: 'Sending in minutes, not weeks',
      copy: 'Verify your domain and send. There are no sales calls or enterprise onboarding to get through before your first email.',
    },
    {
      kind: 'workflows',
      title: 'Event-driven workflows',
      copy: 'Trigger sequences from events your app tracks, with waits and conditions in between, built in a simple editor.',
    },
    {
      kind: 'pricing',
      title: 'One price per email',
      copy: 'Customer.io combines profiles, messages and feature tiers in its pricing. Plunk bills per email sent, with every feature included.',
    },
  ],
  choosePlunk: [
    'You want event-driven email running this week',
    'You want pricing you can work out yourself',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You have a dedicated marketing operations team',
    'You need advanced behavioral segmentation',
    'You run complex, enterprise-scale journeys in visual tools',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: 'Trial only'},
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Complex usage-based tiers'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: true},
    {feature: 'Behavioral segmentation', plunk: true, competitor: true},
    {feature: 'Visual journey builder', plunk: true, competitor: true},
      ],
  faqs: [
    {
      question: 'When should I choose Customer.io over Plunk?',
      answer:
        "Choose Customer.io if you need advanced behavioral segmentation, visual journey builders, and have a dedicated marketing operations team. Customer.io excels at complex, enterprise-level marketing automation with sophisticated visual tools. Choose Plunk if you want developer-friendly APIs, simpler workflows, and don't need the overhead of an enterprise marketing platform.",
    },
    {
      question: 'What is the pricing difference between Plunk and Customer.io?',
      answer:
        "Plunk uses a simple pay-as-you-go pricing model where you only pay for emails sent. Customer.io has complex usage-based tiers that combine messages sent, active profiles, and feature access. For small to medium teams, Plunk is typically more cost-effective. Customer.io's pricing scales with contact count and feature usage, which can become expensive as you grow.",
    },
    {
      question: 'Is migration from Customer.io to Plunk complex?',
      answer:
        "Migration complexity depends on your current setup. If you use basic transactional emails and simple workflows, migration is straightforward - update your API integration and recreate your workflows. If you rely heavily on Customer.io's visual journey builder and advanced behavioral segmentation, you'll need to simplify some workflows. Most teams can migrate in a few days of development work.",
    },
    {
      question: 'What does Plunk simplify compared to Customer.io?',
      answer:
        'Plunk removes enterprise complexity while keeping core functionality. You get a clean, developer-first API instead of complex visual builders. Workflows are defined in code or simple UI, not elaborate journey maps. Pricing is transparent pay-as-you-go instead of tiered complexity. Setup takes minutes instead of weeks. Plunk is open-source and self-hostable, giving you full control without vendor lock-in.',
    },
  ],
  cta: {title: 'Get event-driven email running today.'},
};

export default function CustomerioComparison() {
  return <ComparisonPage comparison={comparison} />;
}
