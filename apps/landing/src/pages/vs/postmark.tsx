import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'postmark',
  name: 'Postmark',
  seo: {
    title: 'Postmark Alternative: Pay-As-You-Go vs Fixed Pricing | Plunk',
    description:
      'Postmark starts at $15/month for 10k emails. Plunk charges $0.001/email — no subscription, no minimums. Plus marketing campaigns, workflows, and open-source code.',
    ogTitle: 'Postmark Alternative: Pay-As-You-Go vs Fixed Pricing | Plunk',
    ogDescription:
      'Postmark starts at $15/month for 10k emails. Plunk charges $0.001/email — no subscription, no minimums. Plus marketing campaigns and open-source code.',
    ogImageTitle: 'Postmark Alternative: Pay-As-You-Go vs Fixed Pricing',
  },
  headline: (
    <>
      The Postmark alternative
      <br />
      with marketing included
    </>
  ),
  summary:
    'Postmark is built for transactional email, with broadcasts sent through a separate stream but no campaign builder. Plunk sends transactional email on AWS SES and adds campaigns, workflows and segments on the same account, at $0.001 per email.',
  differences: [
    {
      kind: 'campaigns',
      title: 'Newsletters from the same account',
      copy: 'Build, schedule and track newsletters in the dashboard. Postmark sends broadcasts through its API, without a campaign builder or audiences.',
    },
    {
      kind: 'pricing',
      title: 'No monthly minimum',
      copy: 'Postmark’s paid plans start at $15 a month for 10,000 emails. Plunk charges $0.001 per email, with transactional and marketing at the same rate.',
    },
    {
      kind: 'transactional',
      title: 'Transactional stays reliable',
      copy: 'Plunk runs on AWS SES with custom domains, DKIM and delivery analytics. Use it for transactional email only if that is all you need.',
    },
  ],
  choosePlunk: [
    'You want transactional and marketing email on one bill',
    'You want automated sequences like onboarding or re-engagement',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You only send transactional email and want a service focused on it',
    'You already have a separate tool for newsletters and automation',
    'You prefer a fixed monthly plan to paying per email',
  ],
  table: [
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: 'Broadcast streams (API)'},
    {feature: 'Workflow automation', plunk: true, competitor: false},
    {feature: 'Dynamic segmentation', plunk: true, competitor: false},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
  ],
  faqs: [
    {
      question: 'What is the main difference between Plunk and Postmark?',
      answer:
        'Postmark focuses on transactional email, with broadcasts sent through the API, while Plunk offers transactional emails plus marketing campaigns, workflow automation, and dynamic segmentation. Plunk is also open-source and self-hostable, giving you more flexibility and control.',
    },
    {
      question: 'Is Plunk as reliable as Postmark for transactional emails?',
      answer:
        'Yes. Plunk is built on AWS SES, which has excellent deliverability and reliability comparable to Postmark. Both support custom domains, DKIM authentication, and provide detailed delivery analytics. The key difference is Plunk adds marketing and automation features on top.',
    },
    {
      question: 'Can I use Plunk for just transactional emails like Postmark?',
      answer:
        'Absolutely. You can use Plunk purely for transactional emails just like Postmark. The marketing campaigns and workflows are optional features that are available when you need them, at no extra cost.',
    },
    {
      question: 'Why should I choose Plunk over Postmark?',
      answer:
        'Choose Plunk if you want transactional emails plus marketing capabilities in one platform. You get campaigns, automation, and segmentation without paying for a second service. Plunk is also open-source, so you can self-host or inspect the code.',
    },
    {
      question: 'How easy is it to migrate from Postmark to Plunk?',
      answer:
        "Migration is straightforward. Plunk's API is simple and well-documented. Update your application to use Plunk's API endpoints, configure your custom domain, and you're ready to go. Most migrations take a few hours.",
    },
  ],
  cta: {title: 'Keep your transactional email and add marketing to it.'},
};

export default function PostmarkComparison() {
  return <ComparisonPage comparison={comparison} />;
}
