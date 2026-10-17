import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'activecampaign',
  name: 'ActiveCampaign',
  seo: {
    title: 'ActiveCampaign Alternative: Open-Source & Affordable | Plunk',
    description:
      "Powerful email automation without ActiveCampaign's complexity and cost. Open-source, developer-friendly, pay-as-you-go pricing. No CRM bloat.",
    ogTitle: 'ActiveCampaign Alternative: Open-Source & Affordable | Plunk',
    ogDescription:
      "Powerful email automation without ActiveCampaign's complexity and cost. Open-source, developer-friendly, pay-as-you-go pricing.",
    ogImageTitle: 'ActiveCampaign Alternative: Open-Source & Affordable',
  },
  headline: (
    <>
      The ActiveCampaign alternative
      <br />
      without the CRM
    </>
  ),
  summary:
    'ActiveCampaign is a marketing and sales platform with a CRM, lead scoring and sales automation. Plunk does the email part, with campaigns and workflows included, and charges per email instead of by tier.',
  differences: [
    {
      kind: 'workflows',
      title: 'Email automation without a CRM',
      copy: 'Build sequences with triggers, delays and conditions. There is no CRM to configure before you send your first email.',
    },
    {
      kind: 'pricing',
      title: 'Every feature, no tiers',
      copy: 'Plunk bills per email with all automation included. ActiveCampaign starts at $29/month, and advanced automation costs $149/month or more.',
    },
    {
      kind: 'ownership',
      title: 'Open source and self-hostable',
      copy: 'Plunk is AGPL-3.0 licensed and runs on your own servers with Docker. ActiveCampaign is cloud-only.',
    },
  ],
  choosePlunk: [
    'You want email automation without a CRM attached',
    'You want to pay per email instead of a monthly tier',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You need a CRM with sales pipelines and lead scoring',
    'You want SMS marketing and machine learning features in one tool',
    'Your marketing and sales teams work from the same platform',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Expensive tiers'},
    {feature: 'Setup complexity', plunk: '5 minutes', competitor: 'Hours to days'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: true},
    {feature: 'CRM included', plunk: false, competitor: true},
    {feature: 'Sales automation', plunk: false, competitor: true},
    {feature: 'Machine learning', plunk: false, competitor: true},
  ],
  faqs: [
    {
      question: 'When should I choose ActiveCampaign over Plunk?',
      answer:
        'Choose ActiveCampaign if you need a full CRM with sales automation, lead scoring, and machine learning features. ActiveCampaign is designed for marketing and sales teams that need an all-in-one platform. Choose Plunk if you need powerful email automation without the complexity. It is built for developers who want to integrate email into their product without CRM overhead.',
    },
    {
      question: 'What is the price difference between Plunk and ActiveCampaign?',
      answer:
        'ActiveCampaign starts at $29/month for basic features and quickly scales to $149/month or more for automation features. Plunk uses pay-as-you-go pricing. You only pay for emails sent. For email-focused needs, Plunk typically costs 50-80% less than ActiveCampaign while providing the same email automation capabilities.',
    },
    {
      question: "Can Plunk match ActiveCampaign's automation capabilities?",
      answer:
        'For email automation, yes. Plunk supports workflow automation, event-based triggers, and audience segmentation just like ActiveCampaign. The difference is Plunk focuses purely on email, while ActiveCampaign includes CRM, sales automation, and ML-powered recommendations. If you need email automation without sales/CRM features, Plunk delivers the same capability with simpler implementation.',
    },
    {
      question: 'Is migration from ActiveCampaign to Plunk difficult?',
      answer:
        "It depends on your ActiveCampaign usage. If you're primarily using email automation and campaigns, migration is straightforward: export contacts, recreate workflows, and integrate Plunk's API. If you heavily rely on CRM, lead scoring, or sales automation, you'll need separate tools for those features. Most developers migrate in a day or less.",
    },
    {
      question: 'What ActiveCampaign features does Plunk not have?',
      answer:
        "Plunk focuses on email, so it doesn't include ActiveCampaign's CRM, sales pipeline management, lead scoring, SMS marketing, or machine learning features. If you need those, ActiveCampaign is better. If you want powerful email automation without the enterprise complexity, Plunk is the simpler choice.",
    },
  ],
  cta: {title: 'Email automation without paying for a CRM.'},
};

export default function ActiveCampaignComparison() {
  return <ComparisonPage comparison={comparison} />;
}
