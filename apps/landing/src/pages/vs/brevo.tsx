import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'brevo',
  name: 'Brevo',
  seo: {
    title: 'Brevo (Sendinblue) Alternative, Open Source | Plunk',
    description:
      "Done with Brevo's monthly plans? Plunk is a developer-first, open-source alternative that bills $0.001 per email with no tier to commit to, and is self-hostable.",
    ogTitle: 'Brevo (Sendinblue) Alternative, Open Source | Plunk',
    ogDescription:
      "Done with Brevo's monthly plans? Plunk is open-source, self-hostable, and bills $0.001 per email with no tier to commit to.",
    ogImageTitle: 'Brevo Alternative: Developer-First & Open Source',
  },
  headline: (
    <>
      The Brevo alternative
      <br />
      built for developers
    </>
  ),
  summary:
    'Brevo is an all-in-one marketing suite with SMS, chat and CRM, priced in monthly tiers by email volume. Plunk focuses on email for products, stores unlimited contacts and charges $0.001 per email sent, with no tier to pick.',
  differences: [
    {
      kind: 'pricing',
      title: 'No tier to commit to',
      copy: 'Plunk charges $0.001 for each email you send, with no monthly plan. Brevo sells monthly volume tiers that you pick in advance.',
    },
    {
      kind: 'workflows',
      title: 'Automation on every plan',
      copy: 'Workflows are included for everyone. On Brevo, full automation starts on the Standard plan.',
    },
    {
      kind: 'ownership',
      title: 'Open source and self-hostable',
      copy: 'Plunk is AGPL-3.0 licensed and runs on your own servers with Docker. Brevo is proprietary and cloud-only.',
    },
  ],
  choosePlunk: [
    'Your sending volume changes from month to month',
    'You want full automation without upgrading your plan',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You want SMS, chat and CRM alongside email',
    'You prefer an all-in-one marketing suite over a focused tool',
    'You want one vendor for all your marketing channels',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay-as-you-go per email', competitor: 'Monthly tiers by email volume'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Target audience', plunk: 'Developers & SaaS', competitor: 'All-in-one marketing suite'},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: 'Included', competitor: 'Standard plan and up'},
  ],
  faqs: [
    {
      question: 'What is the difference between Plunk and Brevo (Sendinblue)?',
      answer:
        'Plunk is built for developers with a simple API and pay-as-you-go pricing, while Brevo is an all-in-one marketing suite with more features but higher complexity. Plunk is open-source and self-hostable, while Brevo is proprietary. Plunk charges per email sent with unlimited contacts, while Brevo uses monthly plans based on email volume.',
    },
    {
      question: 'Is Plunk cheaper than Brevo?',
      answer:
        "It depends on your usage pattern. Plunk's pay-as-you-go model ($0.001 per email) with unlimited contacts is often more cost-effective for businesses with large contact lists but moderate email volume. Brevo sells monthly plans sized by email volume, so you pay for the tier you picked whether or not you use it.",
    },
    {
      question: 'Can I self-host Plunk unlike Brevo?',
      answer:
        'Yes. Plunk is open-source (AGPL-3.0) and can be self-hosted using Docker, giving you full control over your data and infrastructure. Brevo is a proprietary cloud-only service with no self-hosting option.',
    },
    {
      question: 'Is Plunk easier to use than Brevo?',
      answer:
        'For developers, yes. Plunk focuses on email essentials with a clean API and minimal setup. Brevo offers more features (SMS, chat, CRM) which adds complexity. If you just need email automation, Plunk is simpler. If you need an all-in-one marketing platform, Brevo might be better.',
    },
    {
      question: 'How easy is it to migrate from Brevo to Plunk?',
      answer:
        "Migration is straightforward. Export your contacts from Brevo, import them to Plunk via CSV, and update your application to use Plunk's API. Most migrations take less than a day. Plunk's API is well-documented and easy to integrate.",
    },
  ],
  cta: {title: 'Pay for the emails you send, not a tier.'},
};

export default function BrevoComparison() {
  return <ComparisonPage comparison={comparison} />;
}
