import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'sendgrid',
  name: 'SendGrid',
  seo: {
    title: 'SendGrid Alternative: Pay-As-You-Go & Open Source | Plunk',
    description:
      "Tired of SendGrid's pricing tiers and complexity? Plunk is an open-source alternative with pay-as-you-go pricing at $0.001/email, a modern API, and no lock-in.",
    ogTitle: 'SendGrid Alternative: Pay-As-You-Go & Open Source | Plunk',
    ogDescription:
      "Tired of SendGrid's pricing tiers and complexity? Plunk is open-source with pay-as-you-go pricing at $0.001/email and no lock-in.",
    ogImageTitle: 'SendGrid Alternative: Open Source & Pay-As-You-Go',
  },
  headline: (
    <>
      The SendGrid alternative
      <br />
      you set up in minutes
    </>
  ),
  summary:
    'SendGrid sells email on monthly tiers, with marketing as a separate product and automation on its Advanced marketing plan. Plunk includes all of it, bills $0.001 per email, and takes about five minutes to set up.',
  differences: [
    {
      kind: 'setup',
      title: 'Sending in five minutes',
      copy: 'Verify your domain and call a modern REST API. No IP configuration or subuser accounts to set up first.',
    },
    {
      kind: 'pricing',
      title: 'No monthly tier to pick',
      copy: 'Plunk bills $0.001 per email with no monthly minimum. SendGrid charges a fixed monthly fee for a volume tier, whatever you send.',
    },
    {
      kind: 'campaigns',
      title: 'Marketing included, not sold separately',
      copy: 'Campaigns, workflows and segments come with every account. SendGrid sells marketing as a separate product and keeps automation for its Advanced plan.',
    },
  ],
  choosePlunk: [
    'You want to start sending today without a configuration project',
    'Your volume changes and you do not want a monthly commitment',
    'You want campaigns and automation without a second product',
  ],
  chooseThem: [
    'You are a large enterprise with complex sending needs',
    'You need subuser accounts and fine-grained IP configuration',
    'You rely on enterprise-specific features Plunk does not offer',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Monthly subscription tiers'},
    {feature: 'Setup time', plunk: 'Minutes', competitor: 'Longer, more to configure'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: 'Included', competitor: 'Separate product'},
    {feature: 'Workflow automation', plunk: true, competitor: 'Advanced plan only'},
    {feature: 'Dynamic segmentation', plunk: true, competitor: 'Paid marketing plan'},
    {feature: 'API', plunk: 'One send endpoint', competitor: 'Large, mature API'},
  ],
  faqs: [
    {
      question: 'What is the difference between Plunk and SendGrid pricing?',
      answer:
        "Plunk uses a pay-as-you-go model where you only pay for emails sent, with no monthly minimums. SendGrid uses monthly subscription tiers with fixed costs regardless of actual usage. Plunk's approach means you're not locked into a monthly fee if your email volume varies.",
    },
    {
      question: 'Why is SendGrid so complicated to set up?',
      answer:
        'SendGrid is built for large enterprises with complex needs. It offers IP configuration, subuser accounts and a broad API surface, which takes longer to learn. Plunk is built for developers who want to start sending emails in minutes with a simple, modern API.',
    },
    {
      question: 'Does Plunk have the same deliverability as SendGrid?',
      answer:
        'Yes. Plunk is built on top of AWS SES, which has excellent deliverability comparable to SendGrid. Both platforms support custom domains and DKIM authentication. Plunk also handles bounces and complaints automatically to protect your reputation.',
    },
    {
      question: 'Can I migrate from SendGrid to Plunk?',
      answer:
        "Yes, migration is straightforward. Export your contacts from SendGrid, import them to Plunk via CSV, and update your application to use Plunk's easy API. Most migrations take less than a day.",
    },
    {
      question: 'What SendGrid features does Plunk not have?',
      answer:
        'Plunk focuses on modern email workflows rather than enterprise-specific features. For 95% of use cases, Plunk provides everything you need.',
    },
  ],
  cta: {title: 'Send your first email in five minutes, not hours.'},
};

export default function SendGridComparison() {
  return <ComparisonPage comparison={comparison} />;
}
