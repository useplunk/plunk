import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'buttondown',
  name: 'Buttondown',
  seo: {
    title: 'Buttondown Alternative: Newsletters + Transactional | Plunk',
    description:
      'Buttondown is built for newsletters, with automation as a paid add-on. Plunk is open source at $0.001/email, with transactional email, campaigns, and workflows included.',
    ogTitle: 'Buttondown Alternative: Newsletters + Transactional | Plunk',
    ogDescription:
      'Buttondown is built for newsletters. Plunk is open-source, pay-as-you-go, and includes transactional email, newsletters, and automation in one self-hostable platform.',
    ogImageTitle: 'Open-Source Buttondown Alternative',
  },
  headline: (
    <>
      The Buttondown alternative
      <br />
      beyond newsletters
    </>
  ),
  summary:
    'Buttondown publishes newsletters and charges per subscriber. Plunk sends newsletters too, adds transactional email and workflows, and charges $0.001 per email whatever the size of your list.',
  differences: [
    {
      kind: 'transactional',
      title: 'Receipts and resets, same platform',
      copy: 'Send password resets, receipts and notifications from the same account as your newsletter. Buttondown does not send transactional email.',
    },
    {
      kind: 'pricing',
      title: 'Pay per email, not per subscriber',
      copy: 'Plunk bills $0.001 per email sent. Buttondown prices by subscriber count, with features like automations sold as add-ons.',
    },
    {
      kind: 'workflows',
      title: 'Sequences, not just broadcasts',
      copy: 'Build welcome and re-engagement sequences with triggers, delays and conditions. On Buttondown, automations are a paid add-on.',
    },
  ],
  choosePlunk: [
    'You send transactional email as well as newsletters',
    'You have a large list but send infrequently',
    'You want automated sequences and segments that update themselves',
  ],
  chooseThem: [
    'You are a writer who only publishes a newsletter',
    'You want a polished writing experience without touching code',
    'A simple, minimal interface matters more than automation',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: 'Up to 100 subscribers'},
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Per-subscriber monthly plans'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: false},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: 'Paid add-on'},
    {feature: 'Dynamic segmentation', plunk: true, competitor: 'Paid add-on'},
    {feature: 'API access', plunk: true, competitor: true},
    {feature: 'Custom domains', plunk: true, competitor: true},
  ],
  faqs: [
    {
      question: 'When should I choose Buttondown over Plunk?',
      answer:
        "Choose Buttondown if you're an individual writer or creator who only needs newsletter publishing with a simple, minimal interface. Buttondown is purpose-built for newsletters with a great writing experience. Choose Plunk if you need transactional emails alongside your newsletters, included workflow automation, dynamic segmentation, or an open-source platform you can self-host.",
    },
    {
      question: 'What is the pricing difference between Plunk and Buttondown?',
      answer:
        "Plunk is pay-as-you-go at $0.001/email — you pay per email sent regardless of list size. Buttondown charges by subscriber count, and sells automations and segmentation as add-ons. If you have a large list but send infrequently, Plunk's model is significantly more cost-effective.",
    },
    {
      question: 'Can Plunk replace Buttondown for newsletter publishing?',
      answer:
        "Yes. Plunk's marketing campaigns handle newsletter-style broadcasts to your entire list or segments. You get scheduling, tracking (opens, clicks), and unsubscribe management. The main difference is Plunk is built for developers first — if you want a polished writing-focused UI without any code, Buttondown's editor may feel more natural.",
    },
    {
      question: "What does Plunk offer that Buttondown doesn't?",
      answer:
        'Plunk adds transactional emails (password resets, receipts, notifications), workflow automation (multi-step sequences triggered by events), and dynamic audience segmentation, all included rather than sold as add-ons. Plunk is also open-source (AGPL-3.0) and self-hostable. Buttondown is focused purely on newsletter publishing with no transactional email support.',
    },
  ],
  cta: {title: 'Your newsletter and your product email in one place.'},
};

export default function ButtondownComparison() {
  return <ComparisonPage comparison={comparison} />;
}
