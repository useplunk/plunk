import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'mailerlite',
  name: 'MailerLite',
  seo: {
    title: 'MailerLite Alternative: Open-Source & Self-Hostable | Plunk',
    description:
      'The truly developer-first MailerLite alternative. Open-source, self-hostable, pay per email not per subscriber. Modern API, full transparency.',
    ogTitle: 'MailerLite Alternative: Open-Source & Self-Hostable | Plunk',
    ogDescription:
      'The truly developer-first MailerLite alternative. Open-source, self-hostable, pay per email not per subscriber.',
    ogImageTitle: 'MailerLite Alternative: Open-Source & Self-Hostable',
  },
  headline: (
    <>
      The MailerLite alternative
      <br />
      that bills per email
    </>
  ),
  summary:
    'MailerLite is a marketing platform priced by how many subscribers you store. Plunk charges for the emails you send instead, so contacts are free, and it is open source with the option to self-host.',
  differences: [
    {
      kind: 'pricing',
      title: 'Pay per email, not per subscriber',
      copy: 'MailerLite plans grow with your subscriber count. Plunk only bills emails sent, so a large list you email now and then stays cheap.',
    },
    {
      kind: 'ownership',
      title: 'Open source, and yours to host',
      copy: 'Plunk is AGPL-3.0 and runs on your own servers with Docker, or on our cloud. MailerLite is proprietary and cloud-only.',
    },
    {
      kind: 'setup',
      title: 'Sending in five minutes',
      copy: 'Add your domain, add three DNS records and send through the REST API. MailerLite is built UI first, with the API alongside.',
    },
  ],
  choosePlunk: [
    'You have a large list and do not want to pay for every subscriber',
    'You keep email templates in code and send through an API',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You want an advanced drag-and-drop builder for your marketers',
    'The people writing emails are not developers',
    'You email your whole list often, so per-subscriber pricing costs about the same',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay per email', competitor: 'Pay per subscriber'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: '250 subscribers'},
    {feature: 'Transactional emails', plunk: true, competitor: 'Separate product (MailerSend)'},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Workflow automation', plunk: true, competitor: true},
    {feature: 'Email editor', plunk: 'Visual and HTML', competitor: 'Drag-and-drop'},
    {feature: 'API quality', plunk: 'Modern REST', competitor: 'Good REST'},
  ],
  faqs: [
    {
      question: 'What is the main difference between Plunk and MailerLite?',
      answer:
        "The main difference is that Plunk is open-source and self-hostable, while MailerLite is proprietary SaaS. Plunk uses pay-per-email pricing versus MailerLite's pay-per-subscriber model. Both are developer-friendly, but Plunk is API-first with full code transparency, while MailerLite focuses more on visual email builders with good API support.",
    },
    {
      question: 'Is Plunk more expensive than MailerLite?',
      answer:
        'It depends on your usage pattern. MailerLite charges based on subscriber count (paid plans start at $12/month), while Plunk charges per email sent. If you have a large subscriber list but send infrequently, Plunk is typically cheaper. If you email your entire list frequently, costs are similar. The key difference is predictability: Plunk only charges for actual usage.',
    },
    {
      question: 'Can I self-host Plunk unlike MailerLite?',
      answer:
        'Yes. Plunk is open-source (AGPL-3.0) and can be self-hosted using Docker. This gives you full control over your data, infrastructure costs, and compliance requirements. MailerLite is cloud-only with no self-hosting option. Self-hosting is ideal for privacy-sensitive use cases or cost optimization at scale.',
    },
    {
      question: 'Does Plunk have a drag-and-drop builder like MailerLite?',
      answer:
        "Plunk has a visual editor and an HTML editor side by side, with contact fields and fallbacks. MailerLite excels at visual drag-and-drop building for non-technical users. If you're a developer who prefers code-based templates, Plunk is better. If you need rich visual builders for marketers, MailerLite is better.",
    },
    {
      question: "How does Plunk's API compare to MailerLite?",
      answer:
        "Both have modern REST APIs, but Plunk's API is designed with developers as the primary user. Plunk prioritizes API-first workflows, making it easier to integrate email into your application. MailerLite has a good API but is built UI-first with API as secondary. For programmatic email sending and automation, Plunk offers a superior developer experience.",
    },
  ],
  cta: {title: 'Grow your list without growing your bill.'},
};

export default function MailerliteComparison() {
  return <ComparisonPage comparison={comparison} />;
}
