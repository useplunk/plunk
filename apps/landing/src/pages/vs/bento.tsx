import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'bento',
  name: 'Bento',
  seo: {
    title: 'Bento Alternative: Developer-First Email Platform | Plunk',
    description:
      'Open-source alternative to Bento. API-first email platform without CRM bloat. Self-hostable, pay-as-you-go pricing, built for developers.',
    ogTitle: 'Bento Alternative: Developer-First Email Platform | Plunk',
    ogDescription:
      'Open-source alternative to Bento. API-first email platform without CRM bloat. Self-hostable, pay-as-you-go pricing.',
    ogImageTitle: 'Bento Alternative: Developer-First Email Platform',
  },
  headline: (
    <>
      The Bento alternative
      <br />
      focused on email
    </>
  ),
  summary:
    'Bento is an all-in-one platform for small businesses and creators, with CRM and live chat alongside email. Plunk only does email, through an API, and charges per email sent instead of a subscription after a trial.',
  differences: [
    {
      kind: 'setup',
      title: 'Sending in five minutes',
      copy: 'No CRM, live chat or multi-channel setup comes first. Verify your domain and send through the API.',
    },
    {
      kind: 'pricing',
      title: 'Pay per email, no trial clock',
      copy: 'Bento offers a 30-day trial, then a subscription. Plunk bills per email sent, with no monthly commitment.',
    },
    {
      kind: 'ownership',
      title: 'Open source and self-hostable',
      copy: 'Plunk is AGPL-3.0 licensed and deploys on your own servers with Docker. Bento is closed source and cloud-only.',
    },
  ],
  choosePlunk: [
    'You want to send email from your own product through an API',
    'You want to pay per email instead of a subscription',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You want CRM and live chat in the same tool as email',
    'You rely on pre-built integrations like Shopify and WordPress',
    'You prefer working in a UI over writing code',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Trial then subscription'},
    {feature: 'Target audience', plunk: 'Developers', competitor: 'Small businesses/creators'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: true},
    {feature: 'CRM features', plunk: false, competitor: true},
    {feature: 'Live chat', plunk: false, competitor: 'Paid add-on'},
    {feature: 'API-first design', plunk: true, competitor: 'Integration-focused'},
  ],
  faqs: [
    {
      question: 'When should I choose Bento over Plunk?',
      answer:
        "Choose Bento if you need an all-in-one platform with CRM, live chat, and customer relationship features alongside email. Bento is designed for small businesses and creators who want everything in one place. Choose Plunk if you're a developer who needs focused email automation without CRM bloat. It's built specifically for integrating email into your product.",
    },
    {
      question: 'What is the pricing difference between Plunk and Bento?',
      answer:
        'Bento offers a 30-day unlimited trial, then switches to subscription pricing. Plunk uses pay-as-you-go pricing with no trials needed. You only pay for emails sent. For email-focused needs, Plunk is typically more cost-effective. Bento includes CRM and live chat in the price, so if you need those features, Bento may offer better value.',
    },
    {
      question: 'Can Plunk handle email automation like Bento?',
      answer:
        'Yes. Plunk supports workflow automation, event-based triggers, transactional emails, and marketing campaigns. All the email features Bento offers. The difference is Plunk focuses purely on email, while Bento includes CRM, live chat, and customer relationship management. If you only need email automation, Plunk is simpler.',
    },
    {
      question: 'How does the developer experience compare?',
      answer:
        'Plunk is API-first, designed specifically for developers who want to integrate email into their applications. Bento is integration-focused, designed for small businesses using tools like Shopify and WordPress. Plunk gives developers more control and flexibility, while Bento offers pre-built integrations and a UI-first approach.',
    },
    {
      question: 'Is migration from Bento to Plunk easy?',
      answer:
        "For email features, yes. Export your contacts from Bento, import them to Plunk, recreate your workflows using our API or dashboard, and integrate Plunk into your application. If you rely heavily on Bento's CRM, live chat, or multi-channel features, you'll need separate tools for those. Most email-only migrations take a few hours.",
    },
  ],
  cta: {title: 'Send email from your product, billed per email.'},
};

export default function BentoComparison() {
  return <ComparisonPage comparison={comparison} />;
}
