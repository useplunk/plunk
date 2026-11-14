import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

/**
 * useSend is the other open-source, SES-based platform people find next to
 * Plunk. Both are AGPL and self-hostable, so the page leads with what differs:
 * automation, segments and where the cloud keeps its data. Their pricing was
 * checked against usesend.com in October 2026.
 */
const comparison: Comparison = {
  slug: 'usesend',
  name: 'useSend',
  seo: {
    title: 'Plunk vs useSend: Open-Source Email Platforms Compared',
    description:
      'Plunk and useSend are both open source and built on Amazon SES. Plunk adds workflow automation, dynamic segments and EU hosting.',
    ogTitle: 'Plunk vs useSend: Open-Source Email Platforms Compared',
    ogDescription:
      'Both are open source and built on Amazon SES. Plunk adds workflow automation, dynamic segments and EU hosting.',
    ogImageTitle: 'Plunk vs useSend',
  },
  headline: (
    <>
      The useSend alternative
      <br />
      with automation
    </>
  ),
  summary:
    'Plunk and useSend are both open source and send through Amazon SES. Plunk adds event-triggered workflows and segments that update themselves, and Plunk Cloud stores your data in the EU.',
  differences: [
    {
      kind: 'workflows',
      title: 'Workflows, not just sends',
      copy: 'Onboarding, trial and win-back sequences with triggers, delays and conditions, started by the events your product already tracks.',
    },
    {
      kind: 'segments',
      title: 'Segments that keep up',
      copy: 'Audiences built from contact data and email activity that update as contacts change, ready for campaigns and workflow triggers.',
    },
    {
      kind: 'eu',
      title: 'Hosted in the EU',
      copy: 'Plunk Cloud stores contacts and email history in Germany, with a DPA included. Or run the same open-source code yourself.',
    },
  ],
  choosePlunk: [
    'You want automated sequences triggered by product events',
    'You want segments that update themselves for campaigns and workflows',
    'You need your data stored in the EU without running it yourself',
  ],
  chooseThem: [
    'You mostly send transactional email and want the lowest price per email',
    'A larger free tier matters more than automation',
    'You want typed SDKs for TypeScript, Python, Go or PHP',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: '3,000 emails/month'},
    {feature: 'Paid pricing', plunk: '$0.001 per email', competitor: '$0.0004 transactional, $0.001 marketing'},
    {feature: 'Monthly minimum', plunk: 'None', competitor: '$10'},
    {feature: 'Open source', plunk: 'AGPL-3.0', competitor: 'AGPL-3.0'},
    {feature: 'Self-hostable', plunk: true, competitor: true},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'SMTP', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: false},
    {feature: 'Dynamic segments', plunk: true, competitor: false},
    {feature: 'Cloud data stored in the EU', plunk: true, competitor: 'Not stated'},
  ],
  faqs: [
    {
      question: 'What is the difference between Plunk and useSend?',
      answer:
        'Both are open-source email platforms built on Amazon SES, with transactional email, campaigns and SMTP. Plunk adds workflow automation triggered by events, dynamic segments, and an EU-hosted cloud. useSend has a larger free tier and a lower price for transactional email.',
    },
    {
      question: 'Which one is cheaper?',
      answer:
        'It depends on what you send. useSend charges $0.0004 per transactional email and $0.001 per marketing email, with a $10 monthly minimum on its paid plan. Plunk charges $0.001 for every email with no minimum. Mostly transactional senders at volume pay less on useSend; small senders and teams sending marketing and automated email often pay less on Plunk.',
    },
    {
      question: 'Can I self-host both?',
      answer:
        'Yes. Both are AGPL-3.0 licensed and run with Docker. Plunk’s self-hosted version includes everything in Plunk Cloud, workflows and segments included.',
    },
    {
      question: 'How hard is it to switch from useSend to Plunk?',
      answer:
        'Your domains need verifying again, and your send calls change to Plunk’s endpoint, which takes a recipient, a subject and a body or a template ID. Apps that send over SMTP only need new credentials. Contacts can be imported from a CSV.',
    },
  ],
  cta: {title: 'Open source email, with automation included.'},
};

export default function UseSendComparison() {
  return <ComparisonPage comparison={comparison} />;
}
