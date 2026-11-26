import Link from 'next/link';
import React from 'react';

import {GuideTable} from '../components/guides';
import {TERMS_VERSION} from '@plunk/shared';

import {Clause, ENTITY, LegalLayout, LegalSection} from '../components/legal';

export default function TermsOfService() {
  return (
    <LegalLayout
      path={'/terms'}
      title={'Terms of Service'}
      description={'The agreement between you and Plunk for using the hosted Plunk email platform.'}
      lastUpdated={TERMS_VERSION}
    >
      <LegalSection id={'about'} number={1} title={'About these terms'}>
        <p>
          These Terms of Service (the “Terms”) are a contract between you and {ENTITY.name}, registered in Belgium under
          enterprise number {ENTITY.enterpriseNumber}, with business address {ENTITY.address}, trading as Plunk
          (“Plunk”, “we”, “us”). They apply to the hosted Plunk service at useplunk.com, including the dashboard, the
          API and our other sending and receiving services (the “Service”).
        </p>
        <p>
          The <Link href={'/dpa'}>Data Processing Agreement</Link> forms part of these Terms. The{' '}
          <Link href={'/privacy'}>Privacy Policy</Link> explains how we handle personal data about you.
        </p>
        <Clause number={'1.1'} title={'Business customers and consumers'}>
          <p>
            You are a <strong>business customer</strong> if you use the Service for your trade, business, craft or
            profession, including on behalf of an organisation. You are a <strong>consumer</strong> if you are an
            individual using the Service for purposes outside your trade, business, craft or profession. Where a clause
            applies to only one of the two, it says so.
          </p>
          <p>
            Nothing in these Terms limits rights that consumer law gives you and that cannot be excluded by contract.
          </p>
        </Clause>
        <Clause number={'1.2'} title={'Accepting on behalf of an organisation'}>
          <p>
            If you accept these Terms for an organisation, you confirm that you are authorised to bind it. In that case
            “you” means the organisation.
          </p>
        </Clause>
        <Clause number={'1.3'} title={'Self-hosted Plunk'}>
          <p>
            The Plunk source code is published under the GNU Affero General Public License v3 (AGPL). If you run Plunk
            on your own infrastructure, the AGPL governs your use of the code and these Terms do not apply.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'account'} number={2} title={'Your account'}>
        <ul>
          <li>You must be at least 18 years old and able to enter into a binding contract.</li>
          <li>
            Keep your account details accurate, in particular your email address. We send notices about the Service,
            your account and these Terms to it.
          </li>
          <li>
            You are responsible for keeping your credentials and API keys secure, and for activity under your account,
            including by members you invite to your projects. Tell us without delay if you suspect unauthorised access.
          </li>
          <li>Each login belongs to one person. Invite others to your projects instead of sharing a login.</li>
        </ul>
      </LegalSection>

      <LegalSection id={'service'} number={3} title={'The Service'}>
        <Clause number={'3.1'} title={'What we provide'}>
          <p>
            The Service is organised in projects: workspaces that hold your contacts, emails, templates and settings,
            and that you can share with members you invite. We provide the Service as described on our website and in
            our documentation, and we improve and change it over time. If we remove or materially reduce a feature you
            rely on, and you are a paying customer or a consumer, we give you at least 30 days’ notice. You may then end
            the contract free of charge within 30 days after the notice or after the change, whichever is later.
          </p>
        </Clause>
        <Clause number={'3.2'} title={'Email delivery'}>
          <p>
            Delivery depends on systems outside our control, such as recipients’ mail servers and spam filters. We do
            not guarantee that any email is delivered, opened or placed in the inbox.
          </p>
        </Clause>
        <Clause number={'3.3'} title={'Availability and support'}>
          <p>
            We aim to keep the Service available at all times, but we do not promise uninterrupted operation and do not
            offer a service level agreement unless we agree one in writing. We may carry out maintenance, which we
            announce in advance where we reasonably can. Support is available by email and through our community
            channels.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'acceptable-use'} number={4} title={'Acceptable use and sending rules'}>
        <Clause number={'4.1'} title={'Permission-based email only'}>
          <p>
            Send email only to people who asked to receive it from you, to your existing customers where the law allows
            you to email them without prior consent, or to people who need a transactional message for a relationship
            they have with you. Cold email is not allowed. This includes one-off outreach and email to purchased,
            rented, scraped or shared lists.
          </p>
        </Clause>
        <Clause number={'4.2'} title={'Sending requirements'}>
          <ul>
            <li>Marketing email must contain a working unsubscribe link, and you must honour unsubscribes promptly.</li>
            <li>Identify yourself accurately as the sender and do not falsify headers or sender information.</li>
            <li>Keep records of how and when your contacts gave permission.</li>
            <li>Send messages as transactional only if they genuinely are.</li>
            <li>
              Comply with the laws on email marketing, privacy and consumer protection that apply to you and your
              recipients, such as the GDPR and ePrivacy rules in the EU, CAN-SPAM in the United States and CASL in
              Canada.
            </li>
          </ul>
        </Clause>
        <Clause number={'4.3'} title={'Prohibited content and conduct'}>
          <p>You may not use the Service to send, store or link to, or to facilitate:</p>
          <ul>
            <li>illegal content, or content that promotes illegal goods, services or activities;</li>
            <li>phishing, fraud, scams, malware or other harmful code;</li>
            <li>impersonation of another person or organisation;</li>
            <li>harassment, threats, hate speech or incitement to violence;</li>
            <li>sexual content involving minors, or sexual content sent without the recipient’s request;</li>
            <li>content that infringes someone else’s intellectual property or privacy.</li>
          </ul>
          <p>
            You also may not interfere with the Service or its security, get around limits or protections, or resell the
            Service without our written permission.
          </p>
        </Clause>
        <Clause number={'4.4'} title={'Your responsibility'}>
          <p>
            You are responsible for the content you send and upload, for your contact lists, and for having a legal
            basis to process your contacts’ personal data.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'enforcement'} number={5} title={'How we enforce these rules'}>
        <Clause number={'5.1'} title={'Monitoring'}>
          <p>
            To protect recipients and the reputation of our sending infrastructure, we monitor bounce and complaint
            rates and automatically check a sample of outgoing email for phishing and other abuse. Some of these checks
            are fully automated and may use AI models.
          </p>
        </Clause>
        <Clause number={'5.2'} title={'Measures we may take'}>
          <p>
            If we find or reasonably suspect a breach of section 4, we may pause your project, restrict features, remove
            content, or suspend or close your account. A paused project stops sending and blocks changes, including
            deletion, until the issue is resolved; you can still read and export your data through the API. Automated
            systems may pause a project immediately when bounce or complaint rates exceed safe limits or content is
            flagged with high confidence. We take into account how serious the breach is, whether it is repeated and
            whether it appears intentional.
          </p>
        </Clause>
        <Clause number={'5.3'} title={'Our reasons and your response'}>
          <p>
            When we take a measure, we tell you by email what we did, why, which rule it is based on and whether it was
            decided automatically. You can reply to ask for a review by a person, and we will reconsider the decision
            and answer you. You can also take the matter to court.
          </p>
        </Clause>
        <Clause number={'5.4'} title={'Reporting illegal content'}>
          <p>
            Anyone can report content stored on or sent through the Service that they believe is illegal, by email to{' '}
            <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>. Please include:
          </p>
          <ul>
            <li>why you believe the content is illegal;</li>
            <li>where it can be found, such as a URL or the email with its full headers;</li>
            <li>your name and email address, unless the report concerns child sexual abuse material;</li>
            <li>a statement that you believe in good faith that the report is accurate and complete.</li>
          </ul>
          <p>
            We confirm receipt, handle the report diligently and tell you what we decided. This address is also our
            single point of contact for authorities and users under the EU Digital Services Act. You can write to us in
            English or Dutch.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'billing'} number={6} title={'Prices, billing and taxes'}>
        <Clause number={'6.1'} title={'Free plan'}>
          <p>
            The free plan includes a limited number of emails per month, as shown on our{' '}
            <Link href={'/pricing'}>pricing page</Link>. Emails sent on the free plan may carry a small “Powered by
            Plunk” mark.
          </p>
        </Clause>
        <Clause number={'6.2'} title={'Paid plan'}>
          <p>
            On the paid plan you pay for the emails you send and receive, at the prices shown on our pricing page when
            they are sent or received. We bill monthly in arrears through our payment provider, Stripe, to the card you
            add. Invoices are available in your dashboard.
          </p>
        </Clause>
        <Clause number={'6.3'} title={'Card verification charge'}>
          <p>
            When you activate the paid plan or change your card, we charge 2.00 in your billing currency once to confirm
            that your card accepts recurring payments. The amount is credited to your account balance and used against
            your future usage. The credit has no cash value, cannot be refunded or transferred, and lapses when your
            account is closed, with three exceptions: a consumer who withdraws is refunded as section 7 describes; if we
            end the contract other than because of your breach, we refund any unused credit; and we refund wherever the
            law otherwise requires it.
          </p>
          <p>
            Prepaid cards are not accepted. Until the verification succeeds, sending on the paid plan stays paused. If
            it does not succeed within 30 days, we cancel the paid plan.
          </p>
        </Clause>
        <Clause number={'6.4'} title={'Taxes'}>
          <p>
            Prices exclude VAT and other taxes unless stated otherwise. Where the law requires us to charge VAT, we add
            it at the applicable rate based on your location and on whether you are a business. Business customers
            established in another EU member state who give us a valid VAT number are invoiced without VAT under the
            reverse-charge mechanism. Prices shown to consumers include any VAT we are required to charge. You must give
            us accurate billing details.
          </p>
        </Clause>
        <Clause number={'6.5'} title={'Failed payments'}>
          <p>
            If a payment fails, we may pause sending immediately and we will notify you. Pausing cancels scheduled sends
            and running automations, which are not resumed automatically. Sending resumes once outstanding amounts are
            paid. If an amount remains unpaid 30 days after we have reminded you, we may end the contract under section
            10.3.
          </p>
        </Clause>
        <Clause number={'6.6'} title={'Price changes'}>
          <p>
            We may change our prices for a valid reason, such as changes in our infrastructure or third-party costs, in
            taxes or in the Service. We announce a price increase by email at least 30 days before it applies to you.
            You may end the contract free of charge before the increase takes effect. Price decreases can apply
            immediately.
          </p>
        </Clause>
        <Clause number={'6.7'} title={'Refunds and billing disputes'}>
          <p>
            Because you pay for emails after they are sent, usage charges are not refunded, unless we charged you in
            error or the law requires a refund. Business customers must raise any dispute about an invoice within 60
            days of its date.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'withdrawal'} number={7} title={'Right of withdrawal for consumers'}>
        <p>This section applies only to consumers.</p>
        <Clause number={'7.1'} title={'Withdrawal period'}>
          <p>
            You may withdraw from the contract without giving a reason within 14 days after the day you create your
            account. For the paid plan, the period runs for 14 days after the day you activate it.
          </p>
        </Clause>
        <Clause number={'7.2'} title={'How to withdraw'}>
          <p>
            Send us a clear statement of your decision, for example by email to{' '}
            <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>. You may use the model form below, but you do not have
            to. You meet the deadline if you send your statement before the withdrawal period ends.
          </p>
        </Clause>
        <Clause number={'7.3'} title={'Starting during the withdrawal period'}>
          <p>
            By activating the paid plan, you ask us to start providing the Service during the withdrawal period. If you
            withdraw, you pay for the emails sent up to the moment you told us, and we refund every other payment you
            made, including the unused part of the card verification charge. We refund within 14 days of receiving your
            statement, using the payment method you used, at no cost to you.
          </p>
        </Clause>
        <Clause number={'7.4'} title={'Model withdrawal form'}>
          <div className={'rounded-card border border-neutral-200 p-5 sm:p-6'}>
            <p>
              To {ENTITY.name}, trading as {ENTITY.tradeName}, {ENTITY.address}, {ENTITY.email}:
            </p>
            <p>
              I hereby give notice that I withdraw from my contract for the provision of the following service: the
              Plunk hosted email platform.
            </p>
            <p>
              Account created on / paid plan activated on: [date]
              <br />
              Name: [name]
              <br />
              Email address of the account: [email]
              <br />
              Date: [date]
            </p>
          </div>
        </Clause>
      </LegalSection>

      <LegalSection id={'your-data'} number={8} title={'Your data'}>
        <Clause number={'8.1'} title={'You keep your data'}>
          <p>
            You keep all rights to the content and data you put into the Service (“Customer Data”). You give us the
            right to host, copy, transmit and otherwise process Customer Data only as needed to provide and secure the
            Service and to comply with the law.
          </p>
        </Clause>
        <Clause number={'8.2'} title={'Personal data'}>
          <p>
            For personal data in Customer Data, such as your contacts, you are the controller and we act as your
            processor under the <Link href={'/dpa'}>Data Processing Agreement</Link>. For personal data about you as a
            customer, we are the controller, as described in the <Link href={'/privacy'}>Privacy Policy</Link>.
          </p>
        </Clause>
        <Clause number={'8.3'} title={'Export and switching'}>
          <p>
            You can export your Customer Data at any time through our API, in a structured, machine-readable format
            (JSON). This covers your contacts with their fields and subscription status, segments, templates, campaigns,
            workflows, events, and emails with their delivery history and any content still stored. It does not cover
            data we keep as controller, such as API request logs and security and abuse records.
          </p>
          <p>
            If you want to move to another provider or to your own infrastructure, tell us. A transitional period of 30
            days then starts, during which the Service keeps running and we give you reasonable help. After it, you have
            at least 30 more days to retrieve your data, after which we erase all exportable data. We do not charge for
            switching or exporting, and there is no notice period for ending the contract.
          </p>
        </Clause>
        <Clause number={'8.4'} title={'Where your data is'}>
          <p>
            We run the Service on infrastructure in the European Union: Hetzner in Germany and Amazon Web Services in
            Sweden. The Data Processing Agreement lists every provider that processes Customer Data and the safeguards
            for any access from outside the EU. If an authority outside the EU asks us for Customer Data in a way that
            conflicts with EU law, we challenge the request, disclose only what we are lawfully required to, and tell
            you unless the law forbids it.
          </p>
        </Clause>
        <Clause number={'8.5'} title={'Feedback'}>
          <p>If you send us suggestions or feedback, we may use them without any obligation to you.</p>
        </Clause>
      </LegalSection>

      <LegalSection id={'intellectual-property'} number={9} title={'Intellectual property'}>
        <p>
          We and our licensors own the Service and everything we provide as part of it, other than Customer Data. The
          source code is licensed under the AGPL, and nothing in these Terms restricts your rights under that licence.
          The Plunk name and logo are our trademarks. Do not use them in a way that suggests we endorse or are
          affiliated with you.
        </p>
      </LegalSection>

      <LegalSection id={'termination'} number={10} title={'Term, suspension and termination'}>
        <Clause number={'10.1'} title={'Term'}>
          <p>The contract starts when you create an account and runs until either of us ends it.</p>
        </Clause>
        <Clause number={'10.2'} title={'Ending the contract yourself'}>
          <p>
            You can end the contract at any time, without notice or cost, by deleting your projects and account in the
            dashboard or by emailing us. If a project is paused and cannot be deleted in the dashboard, email us and we
            will export or delete its data. You pay for usage up to the end of the contract.
          </p>
        </Clause>
        <Clause number={'10.3'} title={'Ending or suspending by us'}>
          <p>
            We may end the contract with 30 days’ notice by email. We may suspend the Service or end the contract with
            immediate effect if:
          </p>
          <ul>
            <li>you seriously or repeatedly breach these Terms, in particular section 4;</li>
            <li>you do not pay as described in section 6.5;</li>
            <li>your use puts the Service, other customers, recipients or our sending reputation at risk; or</li>
            <li>the law or an authority requires it.</li>
          </ul>
          <p>Section 5.3 applies to any such measure.</p>
        </Clause>
        <Clause number={'10.4'} title={'What happens at the end'}>
          <p>
            Your access ends and pending or scheduled sends are cancelled. On request, your Customer Data stays
            available for export during the periods in section 8.3. We then delete it as described in the Data
            Processing Agreement. Amounts owed become payable. Clauses that by their nature continue to apply, such as
            those on payment, liability and disputes, survive the end of the contract.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'liability'} number={11} title={'Warranties and liability'}>
        <Clause number={'11.1'} title={'Our commitment'}>
          <p>
            We provide the Service with reasonable care and skill. For business customers, the Service is otherwise
            provided as is, and we exclude all implied warranties to the extent the law allows.
          </p>
        </Clause>
        <Clause number={'11.2'} title={'Legal guarantee for consumers'}>
          <p>
            Consumers benefit from the legal guarantee of conformity for digital services: the Service must conform to
            the contract for as long as we provide it. If it does not, you are entitled to have it brought into
            conformity and, where the law allows, to a price reduction or to end the contract.
          </p>
        </Clause>
        <Clause number={'11.3'} title={'Liability towards business customers'}>
          <p>
            We are not liable for indirect or consequential loss, loss of profit, revenue or goodwill, loss of data
            unless caused by our breach of the security obligations in the Data Processing Agreement, or the results of
            your email campaigns. Our total liability for all claims in any 12-month period is limited to the higher of
            the amount you paid us in the 12 months before the event giving rise to the claim, or EUR 100.
          </p>
        </Clause>
        <Clause number={'11.4'} title={'Liability towards consumers'}>
          <p>
            We are liable for damage caused by our failure to perform the contract or by our fault, but not for damage
            that was not foreseeable when the contract was concluded or that results from your own breach of these
            Terms.
          </p>
        </Clause>
        <Clause number={'11.5'} title={'What we never limit'}>
          <p>
            Nothing in these Terms limits liability for fraud, intentional misconduct, gross negligence, death or
            personal injury, or any other liability that cannot be limited by law.
          </p>
        </Clause>
        <Clause number={'11.6'} title={'Indemnity by business customers'}>
          <p>
            Business customers will compensate us for third-party claims, fines and reasonable costs that result from
            the content they send, their contact lists, or their breach of section 4 or of data protection law. We will
            tell you promptly about such a claim and let you take charge of the defence.
          </p>
        </Clause>
        <Clause number={'11.7'} title={'Force majeure'}>
          <p>
            Neither of us is liable for failing to perform because of events beyond our reasonable control, such as
            outages of third-party networks, cyberattacks, natural disasters or government action. This does not affect
            your obligation to pay for usage.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'changes'} number={12} title={'Changes to these terms'}>
        <p>
          We may change these Terms for a valid reason, such as a change in the law or in guidance from an authority, a
          change to the Service, the need to prevent abuse or protect security, a change in our costs or providers, or
          to make the Terms clearer.
        </p>
        <p>
          We announce material changes by email at least 30 days before they take effect. If you do not agree, you may
          end the contract free of charge before then. If you keep using the Service after that date, the new Terms
          apply. Changes required by law, or that only benefit you, may take effect sooner. Previous versions are
          available on request.
        </p>
      </LegalSection>

      <LegalSection id={'disputes'} number={13} title={'Governing law and disputes'}>
        <Clause number={'13.1'} title={'Talk to us first'}>
          <p>
            If you have a complaint, email us at <a href={`mailto:${ENTITY.email}`}>{ENTITY.email}</a>. We aim to
            resolve it within 30 days.
          </p>
        </Clause>
        <Clause number={'13.2'} title={'Governing law'}>
          <p>
            These Terms are governed by Belgian law. If you are a consumer, you also keep the protection of the
            mandatory rules of the country where you live.
          </p>
        </Clause>
        <Clause number={'13.3'} title={'Courts'}>
          <p>
            Disputes with business customers fall under the exclusive jurisdiction of the courts of Antwerp, division
            Antwerp. Consumers may bring proceedings in the courts of Belgium or of the country where they live, and we
            may only bring proceedings against a consumer in the country where the consumer lives.
          </p>
        </Clause>
        <Clause number={'13.4'} title={'Out-of-court resolution for consumers'}>
          <p>
            Consumers can also contact the Belgian Consumer Ombudsman Service (Consumentenombudsdienst / Service de
            Médiation pour le Consommateur) at{' '}
            <a href={'https://www.consumentenombudsdienst.be'} target={'_blank'} rel={'noopener noreferrer'}>
              consumentenombudsdienst.be
            </a>
            .
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'general'} number={14} title={'General'}>
        <GuideTable
          stack
          head={['Topic', 'Rule']}
          rows={[
            [
              'Entire agreement',
              'These Terms, the Data Processing Agreement and anything we agree in writing are the whole agreement between us. For consumers, this does not limit what our public descriptions of the Service say it does, which forms part of what the Service must conform to.',
            ],
            [
              'Severability',
              'If a clause is invalid, the rest stays in force and the invalid clause is replaced by a valid one that comes closest to its purpose.',
            ],
            ['No waiver', 'Not enforcing a right straight away does not mean we give it up.'],
            [
              'Transfer',
              'We may transfer the contract to a company we control or to a successor of our business, after notifying you. For consumers this only happens if your rights are not reduced. You may not transfer the contract without our consent.',
            ],
            ['Notices', `We send notices to the email address of your account. Send notices to us at ${ENTITY.email}.`],
            [
              'Language and interpretation',
              'These Terms are written in English. If a clause in a consumer contract is unclear, the interpretation most favourable to the consumer applies.',
            ],
          ]}
        />
      </LegalSection>
    </LegalLayout>
  );
}
