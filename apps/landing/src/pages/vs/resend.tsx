import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'resend',
  name: 'Resend',
  seo: {
    title: 'Open-Source Resend Alternative at $0.001/Email | Plunk',
    description:
      'Resend bills transactional email by plan and marketing by contact. Plunk charges $0.001 per email for both, with unlimited contacts. Open source, hosted in the EU.',
    ogTitle: 'Open-Source Resend Alternative at $0.001/Email | Plunk',
    ogDescription:
      'Resend bills transactional email by plan and marketing by contact. Plunk charges $0.001 per email for both, with unlimited contacts.',
    ogImageTitle: 'Open-Source Resend Alternative',
  },
  headline: (
    <>
      The Resend alternative
      <br />
      with one simple bill
    </>
  ),
  summary:
    'Resend sells transactional email and marketing email as separate plans, with marketing priced per contact. Plunk sends both, plus workflows, at $0.001 per email with unlimited contacts, and it is open source.',
  differences: [
    {
      kind: 'pricing',
      title: 'Never priced per contact',
      copy: 'Resend marketing plans are sized by how many contacts you store. Plunk stores unlimited contacts for free and bills only for the emails you send.',
    },
    {
      kind: 'campaigns',
      title: 'One plan for everything',
      copy: 'Transactional, campaign and workflow email share one price and one contact list. No second plan to size, no second limit to watch.',
    },
    {
      kind: 'ownership',
      title: 'Open source, hosted in the EU',
      copy: 'Plunk is AGPL-3.0 licensed. Use Plunk Cloud, with data stored in Germany, or run the same code on your own servers.',
    },
  ],
  choosePlunk: [
    'You have a large contact list and send to it occasionally',
    'You want one price for transactional, marketing and automated email',
    'You want open source, with the option to self-host',
  ],
  chooseThem: [
    'You want a larger free tier for transactional email',
    'You build emails with React Email and want the tightest integration',
    'You prefer a fixed monthly plan to pay-as-you-go',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: '3,000 emails/month'},
    {feature: 'Transactional pricing', plunk: '$0.001 per email', competitor: 'Monthly plans from $20'},
    {feature: 'Marketing pricing', plunk: '$0.001 per email', competitor: 'Per contact, from $40/month'},
    {feature: 'Unlimited contacts', plunk: true, competitor: false},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: false},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Broadcasts and campaigns', plunk: true, competitor: true},
    {feature: 'Automations', plunk: true, competitor: true},
    {feature: 'Segments', plunk: true, competitor: true},
    {feature: 'Inbound email', plunk: true, competitor: true},
  ],
  faqs: [
    {
      question: 'When should I choose Resend over Plunk?',
      answer:
        'Choose Resend if you mostly send transactional email and want its larger free tier, or if your team builds emails with React Email. Choose Plunk if you also send to a large contact list, since Plunk never prices by contacts, or if you want open source and EU hosting.',
    },
    {
      question: 'What is the pricing difference between Plunk and Resend?',
      answer:
        'Resend has separate plans: transactional email by monthly volume, and marketing email by the number of contacts you store. Plunk charges $0.001 for every email, whatever kind, with unlimited contacts and no monthly plan. Pricing checked against resend.com in October 2026.',
    },
    {
      question: 'Is Resend open source? Can I self-host it?',
      answer:
        'No. Resend’s platform is closed source and only available as a hosted service; React Email, the template library Resend maintains, is the open-source part. Plunk is open source under AGPL-3.0, so you can use Plunk Cloud or run the same code on your own servers with Docker.',
    },
    {
      question: 'Is migration from Resend to Plunk complex?',
      answer:
        'You verify your domain in Plunk, change your send calls to Plunk’s endpoint, and import your contacts from a CSV. Both use a recipient, subject and HTML body or a template, so the concepts carry over. Most teams finish in an afternoon.',
    },
    {
      question: 'Does Plunk have the same features as Resend?',
      answer:
        'Both have transactional email, broadcasts, automations, segments, webhooks and inbound email. The differences are pricing, where Plunk bills per email and never per contact, and ownership, since Plunk is open source and can run on your own servers.',
    },
  ],
  cta: {title: 'One price for every email you send.'},
};

export default function ResendComparison() {
  return <ComparisonPage comparison={comparison} />;
}
