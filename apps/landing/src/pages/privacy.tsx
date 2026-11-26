import Link from 'next/link';
import React from 'react';

import {GuideTable} from '../components/guides';
import {ENTITY, LegalLayout, LegalSection} from '../components/legal';

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      path={'/privacy'}
      title={'Privacy Policy'}
      description={
        'How Plunk handles personal data about its customers, website visitors and the people who contact us.'
      }
      lastUpdated={'2026-11-26'}
    >
      <LegalSection id={'scope'} number={1} title={'Who we are and what this policy covers'}>
        <p>
          The controller responsible for the processing described here is {ENTITY.name}, registered in Belgium under
          enterprise number {ENTITY.enterpriseNumber}, with business address {ENTITY.address}, trading as Plunk
          (“Plunk”, “we”, “us”). For any question about your personal data, email{' '}
          <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>.
        </p>
        <p>This policy covers personal data about:</p>
        <ul>
          <li>people who create or use a Plunk account, including members invited to a project;</li>
          <li>visitors to our website and dashboard;</li>
          <li>people who contact us; and</li>
          <li>recipients of email sent through Plunk, for the limited processing described in section 7.</li>
        </ul>
        <p>
          It does not cover the personal data our customers store and send with Plunk, such as their contact lists. For
          that data the customer is the controller and we act as their processor under our{' '}
          <Link href={'/dpa'}>Data Processing Agreement</Link>. If you received an email sent with Plunk, the sender is
          the one to ask about it. This policy also does not apply to self-hosted installations of Plunk, which we do
          not operate.
        </p>
      </LegalSection>

      <LegalSection id={'data'} number={2} title={'Personal data we collect'}>
        <GuideTable
          stack
          head={['Category', 'What it includes']}
          rows={[
            [
              'Account data',
              'Email address, password (stored only as a hash), sign-in method (password, Google or GitHub), the version of our terms you accepted and when, project memberships and roles, and your settings.',
            ],
            [
              'Billing data',
              'Name or company name, billing address, VAT number, payment status and invoices. Card details are handled by Stripe; we do not receive your full card number.',
            ],
            [
              'Usage and security data',
              'IP address, browser and device information, timestamps, API requests and errors, and security events such as sign-in attempts.',
            ],
            ['Communications', 'The content of messages you send us and our replies.'],
            [
              'Website analytics',
              'Pages visited, referrer, browser, device type and country, collected without cookies and reported only in aggregate.',
            ],
          ]}
        />
        <p>
          You must give us an email address to create an account, and billing details to use the paid plan. Without them
          we cannot provide the Service. Everything else is optional or collected automatically when you use the
          Service.
        </p>
      </LegalSection>

      <LegalSection id={'purposes'} number={3} title={'Why we use it and on what legal basis'}>
        <GuideTable
          stack
          head={['Purpose', 'Legal basis']}
          rows={[
            [
              'Creating your account and providing the Service',
              'Performance of our contract with you (GDPR Art. 6(1)(b))',
            ],
            [
              'Billing, invoicing and bookkeeping',
              'Performance of our contract and our legal obligations under tax and accounting law (Art. 6(1)(b) and (c))',
            ],
            [
              'Service emails, such as security alerts, billing notices, project status and changes to our terms',
              'Performance of our contract (Art. 6(1)(b))',
            ],
            [
              'Product updates and marketing emails to our customers',
              'Our legitimate interest in telling customers about our own similar services (Art. 6(1)(f)), within the Belgian rules on email marketing to existing customers. You can unsubscribe from every such email.',
            ],
            [
              'Keeping the Service secure and preventing fraud, spam and abuse, including bot protection at sign-in and automated checks on sending',
              'Our legitimate interest in protecting the Service, our customers and email recipients (Art. 6(1)(f)), and legal obligations where they apply',
            ],
            [
              'Answering your questions and support requests',
              'Performance of our contract or our legitimate interest in responding to you (Art. 6(1)(b) or (f))',
            ],
            [
              'Understanding how our website and product are used, in aggregate',
              'Our legitimate interest in improving them (Art. 6(1)(f))',
            ],
            [
              'Establishing, exercising or defending legal claims, and complying with requests from authorities',
              'Our legitimate interest and our legal obligations (Art. 6(1)(f) and (c))',
            ],
          ]}
        />
        <p>
          Where we rely on legitimate interests, we have weighed them against your rights, and you can object at any
          time (see section 9).
        </p>
        <p>
          Some abuse checks lead to automated decisions. A project is paused automatically when its bounce or complaint
          rate exceeds a set threshold, or when an AI model judges with high confidence that a sampled email is phishing
          or fraud. Pausing stops sending and blocks changes to the project until the issue is resolved. We tell you
          when this happens, and you can contest the decision and ask for it to be reviewed by a person.
        </p>
      </LegalSection>

      <LegalSection id={'recipients'} number={4} title={'Who we share it with'}>
        <p>
          We do not sell personal data and we do not share it for advertising. We share it only with the recipients
          below. Processors act only on our instructions under a contract; independent controllers decide themselves how
          they use the data, under their own privacy policies.
        </p>
        <GuideTable
          stack
          head={['Recipient', 'Purpose', 'Role', 'Location']}
          rows={[
            [
              'Hetzner Online GmbH',
              'Hosting of our servers, database and file storage, including our own analytics and monitoring',
              'Processor',
              'Germany',
            ],
            [
              'Amazon Web Services EMEA SARL',
              'Sending and receiving email, delivery notifications and backups',
              'Processor',
              'Sweden (EU)',
            ],
            [
              'Stripe Payments Europe, Limited',
              'Payments and invoicing',
              'Processor for invoicing; independent controller for payment processing and its own legal obligations',
              'Ireland (EU), with transfers to the United States',
            ],
            ['Cloudflare, Inc.', 'Bot protection on sign-in and sign-up', 'Processor', 'Global'],
            [
              'OpenRouter, Inc.',
              'Automated screening of a sample of outgoing email for phishing and abuse, passed on to the AI model provider we select (currently Google)',
              'Processor',
              'United States',
            ],
            ['Shipmail', 'Our support and legal mailbox', 'Processor', 'Germany'],
            ['Google and GitHub', 'Sign-in, only if you choose it', 'Independent controllers', 'United States'],
          ]}
        />
        <p>We send our own service and marketing emails with Plunk itself.</p>
        <p>
          We may also disclose personal data to professional advisers such as our accountant and lawyers, who are bound
          by confidentiality; to authorities when the law requires it; and to a successor if our business is
          transferred, in which case this policy continues to protect your data.
        </p>
      </LegalSection>

      <LegalSection id={'transfers'} number={5} title={'International transfers'}>
        <p>
          We store personal data in the European Union. Some of our providers are based in, or may access data from,
          countries outside the European Economic Area. Where that happens, we rely on an adequacy decision of the
          European Commission, such as the EU-US Data Privacy Framework for certified companies, or on the Standard
          Contractual Clauses adopted by the Commission. You can ask us for a copy of the relevant safeguards.
        </p>
      </LegalSection>

      <LegalSection id={'retention'} number={6} title={'How long we keep it'}>
        <GuideTable
          stack
          head={['Data', 'Retention']}
          rows={[
            ['Account data', 'As long as your account exists. Deleted when you delete your account, except as below.'],
            [
              'Billing records and invoices',
              'As long as Belgian tax and accounting law requires, currently up to 10 years.',
            ],
            ['API and security logs', '30 days.'],
            [
              'Records of policy violations and suspended accounts',
              'As long as needed to prevent the same abuse from happening again.',
            ],
            [
              'Support correspondence',
              'Up to 12 months after the conversation ends, unless we need it longer to handle a dispute or meet a legal obligation.',
            ],
            [
              'Marketing preferences',
              'Until you unsubscribe. After that we keep your address on a suppression list so we do not email you again.',
            ],
            [
              'Backups',
              'Taken every three hours; only the five most recent are kept, so deleted data is gone from backups within a day.',
            ],
            ['Website analytics', 'Kept indefinitely, without cookies or anything that identifies you.'],
          ]}
        />
      </LegalSection>

      <LegalSection id={'email-recipients'} number={7} title={'Recipients of email sent through Plunk'}>
        <p>
          Our customers decide who they email and what they send, and are responsible for it. If you no longer want
          their emails, use the unsubscribe link in the email or contact the sender.
        </p>
        <p>
          To keep email delivery working and prevent abuse, we also process some data about recipients for our own
          purposes, as controller: the email address, delivery results, bounces, spam complaints, a suppression record
          when an address must not be emailed again, and, for a sample of emails, the content for the automated
          screening described above. We do this on the basis of our legitimate interest in protecting recipients and our
          infrastructure (Art. 6(1)(f)). Delivery results, bounces and complaints are kept as long as the customer keeps
          the related email or contact. Suppression records are kept for as long as the address must not be emailed
          again. Content sent for screening is not kept by OpenRouter or the model provider after the check.
        </p>
      </LegalSection>

      <LegalSection id={'cookies'} number={8} title={'Cookies and similar technologies'}>
        <p>
          We use only what is strictly necessary to provide the Service: a cookie that keeps you signed in to the
          dashboard for up to seven days, a short-lived security cookie while you sign in with Google or GitHub, the bot
          protection on our sign-in and sign-up pages, and browser storage for interface preferences. Our website
          analytics run on our own servers, without cookies and without tracking you across sites. We do not use
          advertising or third-party tracking cookies, so we do not ask for cookie consent.
        </p>
      </LegalSection>

      <LegalSection id={'rights'} number={9} title={'Your rights'}>
        <p>You have the right to:</p>
        <ul>
          <li>access the personal data we hold about you and receive a copy;</li>
          <li>have inaccurate data corrected;</li>
          <li>have your data erased;</li>
          <li>restrict how we use it;</li>
          <li>receive the data you gave us in a machine-readable format and have it transferred;</li>
          <li>object to processing based on our legitimate interests, and to direct marketing at any time;</li>
          <li>not be subject to a decision based solely on automated processing that significantly affects you.</li>
        </ul>
        <p>
          Email <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a> to use any of these rights. Many can also be
          exercised directly in your dashboard. We may ask you to confirm your identity, and we answer within one month.
          Exercising your rights is free. We apply these rights to everyone, wherever they live.
        </p>
        <p>
          You can also lodge a complaint with the Belgian Data Protection Authority (Gegevensbeschermingsautoriteit /
          Autorité de protection des données), Drukpersstraat 35, 1000 Brussels,{' '}
          <a href={'https://www.dataprotectionauthority.be'} target={'_blank'} rel={'noopener noreferrer'}>
            dataprotectionauthority.be
          </a>
          , or with the authority in the country where you live or work.
        </p>
      </LegalSection>

      <LegalSection id={'security'} number={10} title={'Security'}>
        <p>
          We protect personal data with technical and organisational measures appropriate to the risk, including
          encryption in transit, hashed passwords, restricted access and monitoring. If a breach is likely to result in
          a high risk to you, we will tell you without undue delay.
        </p>
      </LegalSection>

      <LegalSection id={'children'} number={11} title={'Children'}>
        <p>
          Plunk is not intended for anyone under 18. We do not knowingly collect their personal data. If you believe a
          minor has created an account, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id={'changes'} number={12} title={'Changes to this policy'}>
        <p>
          We update this policy when our processing changes. We announce material changes by email or in the dashboard
          before they apply. The date at the top shows the current version, and previous versions are available on
          request.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
