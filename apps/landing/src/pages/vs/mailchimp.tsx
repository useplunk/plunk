import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'mailchimp',
  name: 'Mailchimp',
  seo: {
    title: 'Mailchimp Alternative for Developers | Plunk',
    description:
      'Plunk is Mailchimp for developers: code-first email platform with modern API. Pay per email, not per contact. Transactional + marketing in one platform.',
    ogTitle: 'Mailchimp Alternative for Developers | Plunk',
    ogDescription:
      'Plunk is Mailchimp for developers: code-first email platform with modern API. Pay per email, not per contact.',
    ogImageTitle: 'Mailchimp Alternative for Developers',
  },
  headline: (
    <>
      The Mailchimp alternative
      <br />
      that sends receipts too
    </>
  ),
  summary:
    'Mailchimp is a marketing tool priced by contacts stored, with transactional email sold as a paid add-on, Mailchimp Transactional (formerly Mandrill). Plunk sends both from one API and charges only for emails sent.',
  differences: [
    {
      kind: 'transactional',
      title: 'No transactional add-on',
      copy: 'Password resets and receipts go out from the same platform as your newsletters, using the same contact list.',
    },
    {
      kind: 'pricing',
      title: 'Pay per email, not per contact',
      copy: 'Mailchimp charges for every contact on your list, whether you email them or not. Plunk stores contacts for free and bills per email sent.',
    },
    {
      kind: 'workflows',
      title: 'Triggered by what users do',
      copy: "Start workflows from events your app tracks, with waits and conditions in between. Mailchimp keeps automation flows to its paid plans.",
    },
  ],
  choosePlunk: [
    'You send email from your product code',
    'You want transactional and marketing email in one account',
    'You manage your own HTML templates',
  ],
  chooseThem: [
    'You want a drag-and-drop email builder',
    'Your email is run by marketers rather than engineers',
    'You value visual design tools over an API',
  ],
  table: [
    {feature: 'Pricing model', plunk: 'Pay per email', competitor: 'Pay per contact'},
    {feature: 'Target audience', plunk: 'Developers', competitor: 'Marketers'},
        {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: 'Built-in', competitor: 'Paid add-on (Standard+)'},
    {feature: 'Marketing campaigns', plunk: true, competitor: true},
    {feature: 'Event-based triggers', plunk: true, competitor: 'Paid plans only'},
    {feature: 'Developer experience', plunk: 'Excellent', competitor: 'Marketing-first'},
      ],
  faqs: [
    {
      question: 'When should I choose Mailchimp over Plunk?',
      answer:
        "Choose Mailchimp if you're a marketer who needs a drag-and-drop email builder and prefers a marketing-first interface. Mailchimp excels at visual design and non-technical users. Choose Plunk if you're a developer who values API-first design, wants transactional + marketing in one platform, and prefers code over drag-and-drop.",
    },
    {
      question: 'What is the difference between Plunk and Mailchimp pricing?',
      answer:
        'Mailchimp charges per contact stored, regardless of how many emails you send. Plunk uses a pay-as-you-go model where you only pay for emails sent. This means with Mailchimp, your cost increases as your contact list grows, while with Plunk, you only pay when you actually send emails.',
    },
    {
      question: 'Can Plunk handle both transactional and marketing emails?',
      answer:
        "Yes, that's one of Plunk's key advantages. Transactional emails (receipts, password resets) and marketing emails (newsletters, campaigns) are built into one platform. With Mailchimp, transactional email is a paid add-on, Mailchimp Transactional, available on Standard plans and above.",
    },
    {
      question: "Is Plunk's API easier to use than Mailchimp's?",
      answer:
        'Yes, significantly. Plunk has a modern RESTful API designed for developers. Mailchimp\'s API is built around marketing concepts like audiences and merge fields. Plunk sends an email with one request: a recipient, a subject and a body or template.',
    },
    {
      question: 'Does Plunk have a visual email builder like Mailchimp?',
      answer:
        'Plunk has a visual editor and an HTML editor side by side, with contact fields and fallbacks. If your team wants a drag-and-drop builder with a large template library, Mailchimp offers more. If you prefer code and want beautiful, responsive emails, Plunk is the better choice.',
    },
  ],
  cta: {title: 'Send receipts and newsletters from one API.'},
};

export default function MailchimpComparison() {
  return <ComparisonPage comparison={comparison} />;
}
