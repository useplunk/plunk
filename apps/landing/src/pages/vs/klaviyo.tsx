import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'klaviyo',
  name: 'Klaviyo',
  seo: {
    title: 'Klaviyo Alternative: Affordable E-commerce Email | Plunk',
    description:
      "E-commerce email automation without Klaviyo's price tag. Pay-as-you-go pricing, open-source, self-hostable. Perfect for developers building e-commerce.",
    ogTitle: 'Klaviyo Alternative: Affordable E-commerce Email | Plunk',
    ogDescription:
      "E-commerce email automation without Klaviyo's price tag. Pay-as-you-go pricing, open-source, self-hostable.",
    ogImageTitle: 'Klaviyo Alternative: Affordable E-commerce Email',
  },
  headline: (
    <>
      The Klaviyo alternative
      <br />
      priced per email
    </>
  ),
  summary:
    'Klaviyo is an e-commerce marketing platform with SMS, predictive analytics and native store integrations, priced by contact count. Plunk covers the email side, from order confirmations to abandoned-cart flows, and only charges for emails sent.',
  differences: [
    {
      kind: 'pricing',
      title: 'Pay for emails, not contacts',
      copy: 'With 10,000 active profiles, Klaviyo’s email plan costs around $150 a month. Plunk stores contacts at no cost and charges only for the emails you send.',
    },
    {
      kind: 'transactional',
      title: 'Order emails from your backend',
      copy: 'Send order confirmations and shipping notifications from your store with a single API call.',
    },
    {
      kind: 'workflows',
      title: 'Abandoned cart and post-purchase flows',
      copy: 'Build automated sequences triggered by events from Shopify, WooCommerce or your own store, sent through webhooks or the API.',
    },
  ],
  choosePlunk: [
    'You want e-commerce email without contact-based pricing',
    'You are comfortable connecting your store through an API',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You want a native Shopify app with pre-built flows',
    'You send SMS marketing alongside email',
    'You rely on predictive analytics and AI product recommendations',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Contact-based tiers'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: true},
    {feature: 'E-commerce integration', plunk: 'API-based', competitor: 'Native deep'},
    {feature: 'SMS marketing', plunk: false, competitor: true},
    {feature: 'Predictive analytics', plunk: false, competitor: true},
  ],
  faqs: [
    {
      question: 'When should I choose Klaviyo over Plunk?',
      answer:
        'Choose Klaviyo if you need deep native e-commerce integrations (Shopify, WooCommerce), SMS marketing, and AI-powered predictive analytics. Klaviyo excels for established e-commerce brands with dedicated marketing teams and budget for enterprise features. Choose Plunk if you need powerful email automation for e-commerce (or any use case) without the premium price tag. It is built for developers and growing businesses who want the capabilities without the cost.',
    },
    {
      question: 'How much cheaper is Plunk compared to Klaviyo?',
      answer:
        'Klaviyo can be dramatically more expensive. With 10,000 active profiles, Klaviyo’s email plan costs around $150 a month, and more with SMS. Plunk uses pay-as-you-go pricing. You only pay for emails sent, not contacts stored. For email-only use, Plunk usually costs much less, with event-triggered automation included. Capabilities. The savings increase as your contact list grows.',
    },
    {
      question: 'Can Plunk handle e-commerce emails?',
      answer:
        'Yes. Plunk supports all e-commerce email use cases: transactional emails (order confirmations, shipping notifications), marketing campaigns (product launches, sales), and automated workflows (abandoned cart, post-purchase sequences). You integrate via API instead of native Shopify plugins, which gives you more flexibility and control over your email logic.',
    },
    {
      question: 'Does Plunk integrate with Shopify like Klaviyo?',
      answer:
        'Plunk integrates with Shopify and other e-commerce platforms via API. While Klaviyo offers a native Shopify app with pre-built flows, Plunk gives you more control by letting you build exactly the integration you need. You can use webhooks, our API, or build custom integrations. This approach is more flexible but requires development work.',
    },
    {
      question: 'What Klaviyo features does Plunk not have?',
      answer:
        "Plunk focuses on email, so it doesn't include Klaviyo's SMS marketing, native e-commerce platform integrations, AI-powered product recommendations, or predictive analytics. If you need those enterprise features and have the budget, Klaviyo is better. If you want powerful email automation at a fraction of the cost, Plunk delivers.",
    },
  ],
  cta: {title: "Run your store's email without paying per contact."},
};

export default function KlaviyoComparison() {
  return <ComparisonPage comparison={comparison} />;
}
