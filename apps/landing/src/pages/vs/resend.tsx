import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'resend',
  name: 'Resend',
  seo: {
    title: 'Open-Source Resend Alternative at $0.001/Email | Plunk',
    description:
      'Resend uses fixed subscription pricing. Plunk is pay-as-you-go at $0.001/email — open-source, self-hostable, with marketing campaigns and workflow automation included.',
    ogTitle: 'Open-Source Resend Alternative at $0.001/Email | Plunk',
    ogDescription:
      'Resend uses fixed subscription pricing. Plunk is pay-as-you-go at $0.001/email — open-source, self-hostable, with marketing and automation included.',
    ogImageTitle: 'Open-Source Resend Alternative',
  },
  headline: (
    <>
      The Resend alternative
      <br />
      with marketing built in
    </>
  ),
  summary:
    'Resend sends transactional email. Plunk sends it too, and adds campaigns, workflows and segments on the same contact list, so you do not need a second tool for marketing.',
  differences: [
    {
      kind: 'campaigns',
      title: 'Campaigns in the same place',
      copy: 'Send newsletters and announcements to your whole list or a segment, from the same account that sends your receipts.',
    },
    {
      kind: 'workflows',
      title: 'Automation, not just sending',
      copy: 'Build onboarding and follow-up sequences with triggers, delays and conditions. Resend sends single emails only.',
    },
    {
      kind: 'pricing',
      title: 'Pay per email, not per plan',
      copy: 'Plunk bills $0.001 per email with no monthly tiers. Resend charges a fixed subscription with a sending limit per plan.',
    },
  ],
  choosePlunk: [
    'You send transactional and marketing email and want one tool for both',
    'You want automated sequences like onboarding or win-back',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You only ever send transactional email',
    'A larger free tier matters more than marketing features',
    'You are happy running a separate tool for newsletters',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: '3,000 emails/month'},
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Fixed subscription'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: false},
    {feature: 'Workflow automation', plunk: true, competitor: false},
    {feature: 'Dynamic segmentation', plunk: true, competitor: false},
    {feature: 'Event tracking', plunk: true, competitor: true},
    {feature: 'Custom domains', plunk: true, competitor: true},
  ],
  faqs: [
    {
      question: 'When should I choose Resend over Plunk?',
      answer:
        'Choose Resend if you only need transactional emails and prefer a service focused exclusively on that use case. Resend has a larger free tier and excellent developer experience for transactional emails. Choose Plunk if you need marketing campaigns, automation workflows, or want the flexibility to self-host (though Plunk also offers fully-managed hosting).',
    },
    {
      question: 'What is the pricing difference between Plunk and Resend?',
      answer:
        "Plunk uses a pay-as-you-go pricing model, while Resend uses a fixed subscription model. Both optimize for different use cases - Resend focuses exclusively on transactional emails. Plunk includes marketing campaigns and workflow automation at no additional cost. If you need both transactional and marketing emails, Plunk may be more cost-effective overall since you won't need a separate marketing platform.",
    },
    {
      question: 'Is migration from Resend to Plunk complex?',
      answer:
        "Migration requires updating your API integration since Plunk and Resend use different API structures. You'll need to update your code to use Plunk's endpoints and parameter format. However, both platforms support similar features (templates, webhooks, custom domains), so the concepts translate directly. Plan for a few hours of development work to migrate your integration.",
    },
    {
      question: "What does Plunk offer that Resend doesn't?",
      answer:
        'Plunk adds marketing campaigns (one-time broadcasts to segments), workflow automation (multi-step email sequences with triggers and conditions), and dynamic audience segmentation. These features mean you can handle both transactional and marketing emails in one platform. Plunk is also open-source (AGPL-3.0) and self-hostable, giving you full control over your email infrastructure.',
    },
  ],
  cta: {title: 'Send transactional and marketing email from one place.'},
};

export default function ResendComparison() {
  return <ComparisonPage comparison={comparison} />;
}
