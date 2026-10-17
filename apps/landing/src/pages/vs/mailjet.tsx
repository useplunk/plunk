import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'mailjet',
  name: 'Mailjet',
  seo: {
    title: 'Open-Source Mailjet Alternative: Pay-As-You-Go with Workflow Automation | Plunk',
    description:
      'Mailjet uses monthly subscription plans and lacks workflow automation. Plunk is pay-as-you-go at $0.001/email — open-source, self-hostable, with transactional, marketing, and automation in one platform.',
    ogTitle: 'Open-Source Mailjet Alternative: Pay-As-You-Go with Workflow Automation | Plunk',
    ogDescription:
      'Mailjet uses monthly subscriptions and lacks automation. Plunk is pay-as-you-go, open-source, and self-hostable with transactional, marketing, and automation included.',
    ogImageTitle: 'Open-Source Mailjet Alternative',
  },
  headline: (
    <>
      The Mailjet alternative
      <br />
      with workflow automation
    </>
  ),
  summary:
    'Mailjet covers transactional and marketing email on monthly subscription plans, but has no workflow automation. Plunk adds multi-step workflows, bills $0.001 per email, and is open source.',
  differences: [
    {
      kind: 'workflows',
      title: 'Automation Mailjet does not have',
      copy: 'Build onboarding, drip and re-engagement sequences with triggers, delays and conditions. Mailjet offers no workflow automation on any plan.',
    },
    {
      kind: 'pricing',
      title: 'No capacity you do not use',
      copy: 'Plunk bills $0.001 per email sent. Mailjet sells monthly tiers, starting around $17 a month for 15,000 emails, whether you send them or not.',
    },
    {
      kind: 'ownership',
      title: 'Open source, and yours to host',
      copy: 'Plunk is AGPL-3.0 and runs on your own servers with Docker, or on our cloud. Mailjet is closed and cloud-only.',
    },
  ],
  choosePlunk: [
    'You want onboarding and drip sequences that run on their own',
    'Your sending volume changes and you do not want a monthly tier',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You test campaigns with inbox previews or built-in A/B testing',
    'A larger free tier of 200 emails a day matters to you',
    'You want a long-running platform with a broad feature set',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: '200 emails/day (6,000/month)'},
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Monthly subscription plans'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: false},
    {feature: 'Dynamic segmentation', plunk: true, competitor: 'Basic'},
    {feature: 'Event tracking', plunk: true, competitor: true},
    {feature: 'Custom domains', plunk: true, competitor: true},
  ],
  faqs: [
    {
      question: 'When should I choose Mailjet over Plunk?',
      answer:
        'Choose Mailjet if you need inbox preview testing or built-in A/B testing for email campaigns. Mailjet has been around longer and has a broad feature set. Choose Plunk if you need workflow automation, want an open-source platform you can self-host, or prefer pay-as-you-go pricing without monthly subscription commitments.',
    },
    {
      question: 'What is the pricing difference between Plunk and Mailjet?',
      answer:
        "Plunk is pure pay-as-you-go at $0.001/email — you pay only for what you send. Mailjet uses monthly subscription tiers: their Essential plan starts around $17/month for 15,000 emails, scaling up from there. For variable sending volumes, Plunk is more cost-effective since you never pay for capacity you don't use.",
    },
    {
      question: 'Is migration from Mailjet to Plunk complex?',
      answer:
        'Migration requires updating your API integration since Plunk and Mailjet use different API structures. Core concepts (templates, webhooks, custom domains) map directly. Most teams complete the technical migration in a few hours. Contact lists and templates can be adapted with minimal effort.',
    },
    {
      question: "What does Plunk offer that Mailjet doesn't?",
      answer:
        'Plunk adds multi-step workflow automation (triggers, delays, conditions — perfect for onboarding and drip sequences) and is fully open-source under AGPL-3.0, meaning you can self-host on your own infrastructure. Mailjet offers neither workflow automation nor self-hosting. Plunk also uses pure pay-as-you-go pricing rather than tiered subscriptions.',
    },
  ],
  cta: {title: 'Get workflow automation without a monthly plan.'},
};

export default function MailjetComparison() {
  return <ComparisonPage comparison={comparison} />;
}
