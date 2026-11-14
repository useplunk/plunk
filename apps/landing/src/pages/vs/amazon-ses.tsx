import React from 'react';

import {ComparisonPage} from '../../components';
import type {Comparison} from '../../components';

const comparison: Comparison = {
  slug: 'amazon-ses',
  name: 'Amazon SES',
  seo: {
    title: 'Plunk vs Amazon SES: Full Email Platform vs Raw Delivery | Plunk',
    description:
      'Amazon SES handles delivery, with no campaigns, editor or per-email log. Plunk is the full open-source email platform built on SES, with automation included.',
    ogTitle: 'Plunk vs Amazon SES: Full Email Platform vs Raw Delivery | Plunk',
    ogDescription:
      'SES is raw email delivery. Plunk is the full platform built on SES — contact management, campaigns, automation, and analytics. Open-source and self-hostable.',
    ogImageTitle: 'Plunk vs Amazon SES',
  },
  headline: (
    <>
      The Amazon SES alternative
      <br />
      that is a full platform
    </>
  ),
  summary:
    'Amazon SES delivers email and nothing else. Plunk runs on SES and adds contacts, campaigns, workflows, bounce handling and a dashboard, so you do not have to build them yourself.',
  differences: [
    {
      kind: 'campaigns',
      title: 'Contacts and campaigns included',
      copy: 'Store your subscribers, send broadcasts and track opens and clicks. SES has basic contact lists for unsubscribes, but no campaigns.',
    },
    {
      kind: 'workflows',
      title: 'Automation you do not have to build',
      copy: 'Run onboarding flows and drip sequences triggered by events. With raw SES you would write all of this yourself.',
    },
    {
      kind: 'ownership',
      title: 'Self-host for SES pricing',
      copy: 'Run Plunk on your own servers and your SES account handles delivery, so you pay SES rates plus your hosting.',
    },
  ],
  choosePlunk: [
    'You want contacts, campaigns and automation without building them',
    'You want bounces, complaints and unsubscribes handled for you',
    'You want SES deliverability, managed or on your own servers',
  ],
  chooseThem: [
    'You already have an email platform and only need delivery',
    'Your team wants to own every layer and has time to build it',
    'You want the lowest price per email, at $0.10 per 1,000',
  ],
  table: [
    {feature: 'Free tier', plunk: '1,000 emails/month', competitor: 'AWS Free Tier credits only'},
    {feature: 'Pricing model', plunk: 'Pay-as-you-go', competitor: 'Pay-as-you-go (delivery only)'},
    {feature: 'Open source', plunk: true, competitor: false},
    {feature: 'Self-hostable', plunk: true, competitor: 'N/A (AWS-managed)'},
    {feature: 'Transactional emails', plunk: true, competitor: true},
    {feature: 'Marketing campaigns', plunk: true, competitor: false},
    {feature: 'Workflow automation', plunk: true, competitor: false},
    {feature: 'Dynamic segmentation', plunk: true, competitor: false},
    {feature: 'Contact management', plunk: true, competitor: 'Basic contact lists'},
    {feature: 'Dashboard & analytics', plunk: true, competitor: 'Deliverability metrics only'},
  ],
  faqs: [
    {
      question: 'When should I use raw Amazon SES instead of Plunk?',
      answer:
        'Use raw SES if you have an existing email platform and only need a delivery layer, or if your engineering team wants full control over every part of the stack and has the capacity to build contact management, unsubscribe handling, bounce processing, and analytics themselves. Plunk is built on SES — when you self-host Plunk, you get the full platform at near-SES prices.',
    },
    {
      question: 'Is Plunk more expensive than Amazon SES?',
      answer:
        "SES charges $0.10 per 1,000 emails ($0.0001/email) on à la carte pricing, or $0.16 per 1,000 on the Essentials plan new accounts start on, for delivery alone. Plunk's managed service is $0.001/email — 10x more, but that includes contact management, campaigns, automation, segmentation, bounce/complaint handling, an admin dashboard, and unsubscribe management. If you self-host Plunk on your own infrastructure, you pay SES rates directly plus your hosting costs.",
    },
    {
      question: 'Does Plunk use Amazon SES under the hood?',
      answer:
        'Yes. Plunk uses AWS SES for email delivery. That means you get the same deliverability infrastructure as SES, plus the full platform layer on top. When you self-host Plunk, your SES account handles delivery directly — giving you SES pricing with Plunk functionality.',
    },
    {
      question: 'How hard is it to migrate from SES to Plunk?',
      answer:
        "If you're currently sending through SES directly, migrating to Plunk means switching your sending code to use Plunk's API instead of the SES SDK. On Plunk Cloud you verify your domain again in the dashboard; if you self-host Plunk on your own AWS account, your existing SES identities stay where they are. The benefit: you immediately gain contact management, bounce handling, unsubscribe lists, campaign tools, and a dashboard — without building any of that yourself.",
    },
  ],
  cta: {title: 'Send through SES without building the platform yourself.'},
};

export default function AmazonSesComparison() {
  return <ComparisonPage comparison={comparison} />;
}
