import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'brevo',
  name: 'Brevo',
  seo: {
    title: 'Brevo (Sendinblue) Alternative, Open Source | Plunk',
    description:
      "Done with Brevo's contact-based pricing? Plunk is a developer-first, open-source alternative — pay per email not per contact, self-hostable, no contact limits.",
    ogTitle: 'Brevo (Sendinblue) Alternative, Open Source | Plunk',
    ogDescription:
      "Done with Brevo's contact-based pricing? Plunk is open-source, self-hostable, and charges per email not per contact.",
    ogImageTitle: 'Brevo Alternative: Developer-First & Open Source',
  },
  headline: (
    <>
      The Brevo alternative
      <br />
      with unlimited contacts
    </>
  ),
  summary:
    'Brevo is an all-in-one marketing suite with SMS, chat and CRM, priced in tiers by contact count. Plunk focuses on email, stores unlimited contacts and charges $0.001 per email sent.',
  differences: [
    {
      kind: 'pricing',
      title: 'Contacts are free',
      copy: 'Plunk charges $0.001 per email and nothing for the size of your list. Brevo tiers go up as your contacts grow.',
    },
    {
      kind: 'workflows',
      title: 'Automation on every plan',
      copy: 'Workflows are included for everyone. On Brevo, workflow automation is limited to higher tiers.',
    },
    {
      kind: 'ownership',
      title: 'Open source and self-hostable',
      copy: 'Plunk is AGPL-3.0 licensed and runs on your own servers with Docker. Brevo is proprietary and cloud-only.',
    },
  ],
  choosePlunk: [
    'You have a large list but send at a moderate volume',
    'You want automation without upgrading to a higher tier',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You want SMS, chat and CRM alongside email',
    'You prefer an all-in-one marketing suite over a focused tool',
    'You want one vendor for all your marketing channels',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay-as-you-go per email', competitor: 'Monthly tiers by contacts'},
    {feature: 'Contact limits', plunk: 'Unlimited', competitor: 'Tier-based limits'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Target audience', plunk: 'Developers & SaaS', competitor: 'All-in-one marketing suite'},
    {feature: 'Setup time', plunk: '5 minutes', competitor: '30+ minutes'},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: 'Included', competitor: 'Higher tiers only'},
  ],
  faqs: [
    {
      question: 'What is the difference between Plunk and Brevo (Sendinblue)?',
      answer:
        'Plunk is built for developers with a simple API and pay-as-you-go pricing, while Brevo is an all-in-one marketing suite with more features but higher complexity. Plunk is open-source and self-hostable, while Brevo is proprietary. Plunk charges per email sent with unlimited contacts, while Brevo uses tiered pricing based on contact count.',
    },
    {
      question: 'Is Plunk cheaper than Brevo?',
      answer:
        "It depends on your usage pattern. Plunk's pay-as-you-go model ($0.001 per email) with unlimited contacts is often more cost-effective for businesses with large contact lists but moderate email volume. Brevo charges based on contact count, which can become expensive as your audience grows.",
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
  cta: {title: 'Grow your list without growing your bill.'},
};

export default function BrevoComparison() {
  return <ComparisonPage comparison={comparison} />;
}
