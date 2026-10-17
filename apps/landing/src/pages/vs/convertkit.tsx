import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'convertkit',
  name: 'Kit',
  seo: {
    title: 'Kit (ConvertKit) Alternative for Developers | Plunk',
    description:
      'Developer-first alternative to Kit, formerly ConvertKit. Pay per email instead of per subscriber. Open-source, self-hostable, with powerful automation. No landing page bloat.',
    ogTitle: 'Kit (ConvertKit) Alternative for Developers | Plunk',
    ogDescription:
      'Developer-first alternative to Kit, formerly ConvertKit. Pay per email instead of per subscriber. Open-source, self-hostable, with powerful automation.',
    ogImageTitle: 'Kit (ConvertKit) Alternative',
  },
  headline: (
    <>
      The Kit alternative
      <br />
      priced per email
    </>
  ),
  summary:
    'Kit, formerly ConvertKit, is built for creators and charges by subscriber count. Plunk charges only for emails sent, stores contacts for free, and sends transactional email from the same account.',
  differences: [
    {
      kind: 'pricing',
      title: 'Pay per email, not per subscriber',
      copy: 'Kit’s free plan stops at 10,000 subscribers and leaves out automations, and paid plans rise with every subscriber. Plunk stores contacts for free and bills only for emails sent.',
    },
    {
      kind: 'transactional',
      title: 'Transactional email included',
      copy: 'Send password resets and receipts through the same API as your newsletters. Kit does not send transactional email.',
    },
    {
      kind: 'ownership',
      title: 'Open source, and yours to host',
      copy: 'Plunk is AGPL-3.0 licensed and runs on your own servers with Docker if you want it there. Kit is proprietary and cloud-only.',
    },
  ],
  choosePlunk: [
    'You send email from your product and want an API for it',
    'You want receipts and newsletters from one platform',
    'You have a large list that you only email now and then',
  ],
  chooseThem: [
    'You need landing pages and forms built in',
    'You sell courses or digital products to your audience',
    'You want a visual tool made for non-technical creators',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay per email', competitor: 'Pay per subscriber'},
    {feature: 'Target audience', plunk: 'Developers', competitor: 'Creators/marketers'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: false},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: true},
    {feature: 'Landing pages', plunk: false, competitor: true},
    {feature: 'Product selling', plunk: false, competitor: true},
    {feature: 'Built for', plunk: 'Product email', competitor: 'Creator audiences'},
  ],
  faqs: [
    {
      question: 'When should I choose Kit over Plunk?',
      answer:
        "Choose Kit if you're a creator who needs landing pages, product selling, and a creator-focused interface designed for non-technical users. Kit excels at helping course creators, bloggers, and podcasters monetize their audience. Choose Plunk if you're a developer who values API-first design, needs transactional + marketing emails in one platform, and prefers code over visual builders.",
    },
    {
      question: 'What is the pricing difference between Plunk and Kit?',
      answer:
        'Kit charges based on subscriber count. Your cost increases as your list grows, regardless of how many emails you send. Plunk uses pay-as-you-go pricing where you only pay for emails actually sent. On Kit, paid plans rise with every subscriber, even ones you rarely email. With Plunk, you only pay when you send.',
    },
    {
      question: 'Can Plunk handle creator workflows like Kit?',
      answer:
        "Yes, Plunk supports email automation, workflows, and segmentation similar to Kit. You can create automated sequences, trigger emails based on events, and segment your audience. The main difference is Plunk doesn't include landing page builders or product selling features. It's focused purely on email delivery and automation.",
    },
    {
      question: 'Does Plunk have landing pages like Kit?',
      answer:
        "No, Plunk doesn't include landing page or form builders. It's focused on being the best email platform for developers. If you need landing pages, you'd build them with your preferred tools and connect them to Plunk's API. This gives you full design control and keeps Plunk lightweight and developer-friendly.",
    },
    {
      question: 'How easy is it to migrate from Kit to Plunk?',
      answer:
        "Migration is straightforward. Export your subscribers from Kit as CSV, import them to Plunk via our API or dashboard, recreate your email sequences using our workflow builder, and update your forms to use Plunk's API. Most migrations can be completed in a few hours. You'll need to rebuild landing pages separately if you rely on Kit's landing page feature.",
    },
  ],
  cta: {title: 'Stop paying for subscribers you rarely email.'},
};

export default function ConvertkitComparison() {
  return <ComparisonPage comparison={comparison} />;
}
