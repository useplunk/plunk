import Link from 'next/link';
import React from 'react';

import {GuideTable} from '../components/guides';
import {TERMS_VERSION} from '@plunk/shared';

import {Clause, ENTITY, LegalLayout, LegalSection} from '../components/legal';

export default function DataProcessingAgreement() {
  return (
    <LegalLayout
      path={'/dpa'}
      title={'Data Processing Agreement'}
      description={
        'The terms under which Plunk processes personal data on behalf of its customers, as required by Article 28 of the GDPR.'
      }
      lastUpdated={TERMS_VERSION}
    >
      <LegalSection id={'scope'} number={1} title={'Parties and scope'}>
        <p>
          This Data Processing Agreement (“DPA”) is between the customer that accepted our{' '}
          <Link href={'/terms'}>Terms of Service</Link> (“Customer”) and {ENTITY.name}, registered in Belgium under
          enterprise number {ENTITY.enterpriseNumber}, with business address {ENTITY.address}, trading as Plunk
          (“Plunk”). It forms part of the Terms and is accepted together with them. Plunk provides a countersigned copy
          on request.
        </p>
        <Clause number={'1.1'} title={'What it covers'}>
          <p>
            This DPA applies when Plunk processes personal data contained in Customer Data (“Customer Personal Data”) on
            Customer’s behalf while providing the hosted Service. It does not apply to self-hosted installations of
            Plunk, or to personal data Plunk processes as a controller, which the{' '}
            <Link href={'/privacy'}>Privacy Policy</Link> describes.
          </p>
        </Clause>
        <Clause number={'1.2'} title={'Definitions'}>
          <p>
            Terms such as “personal data”, “processing”, “controller”, “processor” and “personal data breach” have the
            meaning given in the GDPR (Regulation (EU) 2016/679). “Data Protection Law” means the GDPR, Belgian data
            protection law and, where they apply, the UK GDPR and the Swiss Federal Act on Data Protection. Other
            capitalised terms have the meaning given in the Terms.
          </p>
        </Clause>
        <Clause number={'1.3'} title={'Order of precedence'}>
          <p>
            On the protection of personal data, this DPA prevails over the Terms. Where Standard Contractual Clauses
            apply under section 8, they prevail over this DPA.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'roles'} number={2} title={'Roles and instructions'}>
        <Clause number={'2.1'} title={'Roles'}>
          <p>
            Customer is the controller of Customer Personal Data and Plunk is its processor. If Customer acts as a
            processor for another controller, Customer confirms that its instructions are authorised by that controller,
            and Plunk acts as Customer’s sub-processor.
          </p>
        </Clause>
        <Clause number={'2.2'} title={'Instructions'}>
          <p>
            Plunk processes Customer Personal Data only on Customer’s documented instructions. These consist of the
            Terms and this DPA, Customer’s configuration and use of the Service, and any further instructions the
            parties agree in writing. If Union or Member State law requires Plunk to process Customer Personal Data
            otherwise, Plunk informs Customer before processing unless the law prohibits it. Plunk tells Customer
            immediately if it believes an instruction infringes Data Protection Law.
          </p>
        </Clause>
        <Clause number={'2.3'} title={'Deliverability and abuse prevention'}>
          <p>
            To keep email delivery working and to prevent abuse of the Service, Plunk processes a limited set of data
            about recipients as an independent controller: delivery results, bounces, complaints, suppression records
            and, for a sample of outgoing emails, their content for automated screening. The Privacy Policy describes
            this processing and the provider used for screening, which is therefore not one of Customer’s
            sub-processors. Customer should mention the processing in its own privacy notice.
          </p>
        </Clause>
        <Clause number={'2.4'} title={'Customer responsibilities'}>
          <p>
            Customer is responsible for the lawfulness of its processing, including having a legal basis for each
            contact, giving the information required by Articles 13 and 14 GDPR, and keeping records of consent.
            Customer will not use the Service to process special categories of personal data or data relating to
            criminal convictions unless the law allows it and the Service offers adequate protection for it.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'confidentiality'} number={3} title={'Confidentiality'}>
        <p>
          Plunk ensures that everyone it authorises to process Customer Personal Data is bound by an obligation of
          confidentiality and only accesses the data as needed to provide, support or secure the Service.
        </p>
      </LegalSection>

      <LegalSection id={'security'} number={4} title={'Security'}>
        <p>
          Plunk implements the technical and organisational measures in Annex II to ensure a level of security
          appropriate to the risk, as required by Article 32 GDPR. Plunk may update these measures, provided the overall
          level of protection is not reduced.
        </p>
      </LegalSection>

      <LegalSection id={'subprocessors'} number={5} title={'Sub-processors'}>
        <Clause number={'5.1'} title={'Authorisation'}>
          <p>
            Customer gives Plunk general authorisation to engage sub-processors. The current sub-processors are listed
            in Annex III. Plunk imposes data protection obligations on each sub-processor that are no less protective
            than those in this DPA, and remains liable to Customer for their performance.
          </p>
        </Clause>
        <Clause number={'5.2'} title={'Changes'}>
          <p>
            Plunk notifies Customer by email at least 30 days before adding or replacing a sub-processor, and updates
            Annex III. Customer may object on reasonable data protection grounds within that period. If the parties
            cannot resolve the objection, Customer may end the contract before the change takes effect, without penalty.
            Where a sub-processor must be replaced urgently for security or continuity reasons, Plunk gives notice as
            soon as possible.
          </p>
        </Clause>
      </LegalSection>

      <LegalSection id={'assistance'} number={6} title={'Assistance'}>
        <p>
          The Service lets Customer access, correct, export and delete Customer Personal Data, and change a contact’s
          subscription status, so that Customer can answer data subject requests. While a project is paused under the
          Terms, Plunk carries out such requests for Customer when asked by email. Plunk forwards to Customer any
          request it receives directly from a data subject about Customer Personal Data, and does not answer it unless
          Customer instructs it to. Taking into account the information available to it, Plunk assists Customer with its
          obligations on security, breach notification, data protection impact assessments and prior consultation with
          authorities.
        </p>
      </LegalSection>

      <LegalSection id={'breaches'} number={7} title={'Personal data breaches'}>
        <p>
          Plunk notifies Customer without undue delay, and in any case within 48 hours, after becoming aware of a
          personal data breach affecting Customer Personal Data. The notice goes to the email addresses of the project’s
          members and includes, as far as known, the information listed in Article 33(3) GDPR. Where not everything is
          known at once, Plunk provides it in phases. Plunk takes reasonable measures to contain the breach and limit
          its effects. A notification is not an admission of fault or liability.
        </p>
      </LegalSection>

      <LegalSection id={'transfers'} number={8} title={'International transfers'}>
        <p>
          Plunk stores Customer Personal Data in the European Economic Area. Where a sub-processor processes it outside
          the EEA, or may access it from there, the transfer relies on an adequacy decision of the European Commission,
          including the EU-US Data Privacy Framework for certified companies, or on the Standard Contractual Clauses
          adopted by Commission Decision (EU) 2021/914.
        </p>
        <p>
          Where Customer is established outside the EEA and Plunk making Customer Personal Data available to Customer is
          a transfer under Data Protection Law, Module 4 (processor to controller) of those Standard Contractual Clauses
          applies and is incorporated by reference, with Belgian law and the courts of Antwerp chosen under clauses 17
          and 18. For transfers subject to the UK GDPR, the UK International Data Transfer Addendum applies in addition,
          and for transfers subject to the Swiss Federal Act on Data Protection, the clauses apply with the adaptations
          required by the Swiss Federal Data Protection and Information Commissioner.
        </p>
      </LegalSection>

      <LegalSection id={'audits'} number={9} title={'Information and audits'}>
        <p>
          Plunk makes available the information needed to demonstrate compliance with Article 28 GDPR, including this
          DPA, Annex II and the certifications of its sub-processors where available. If that is not sufficient,
          Customer, or an independent auditor bound by confidentiality, may audit Plunk once every 12 months, or more
          often if a supervisory authority requires it or after a personal data breach. Customer gives at least 30 days’
          written notice, conducts the audit during business hours without disrupting the Service or other customers’
          data, and bears its own costs.
        </p>
      </LegalSection>

      <LegalSection id={'deletion'} number={10} title={'Deletion and return'}>
        <p>
          During the contract, Customer can export and delete Customer Personal Data at any time through the Service.
          While a project is paused, Plunk exports or deletes its data on Customer’s request by email.
        </p>
        <p>
          At the end of the contract, however it ends, Customer chooses whether to receive its data or have it deleted.
          Customer can export the data before closing its account, or during the periods in section 8.3 of the Terms if
          it asks. Plunk deletes Customer Personal Data from its production systems when Customer deletes the project or
          account, and otherwise within 30 days after the contract ends and any export period has passed. Backups are
          taken every three hours and only the five most recent are kept, so deleted data is gone from them within a
          day. This does not apply to data that the law requires Plunk to keep.
        </p>
      </LegalSection>

      <LegalSection id={'liability'} number={11} title={'Liability'}>
        <p>
          Each party is liable as set out in Article 82 GDPR. Between the parties, the limitations of liability in the
          Terms apply to this DPA, to the extent Data Protection Law allows. Nothing in this DPA limits either party’s
          liability towards data subjects.
        </p>
      </LegalSection>

      <LegalSection id={'term'} number={12} title={'Term and changes'}>
        <p>
          This DPA applies for as long as Plunk processes Customer Personal Data. Obligations that by their nature
          continue after that, such as confidentiality and deletion, survive. Plunk may change this DPA in the same way
          as the Terms; changes required by law may take effect sooner. A change never reduces the overall protection of
          Customer Personal Data.
        </p>
      </LegalSection>

      <LegalSection id={'annex-1'} title={'Annex I: Description of the processing'}>
        <GuideTable
          stack
          head={['Item', 'Description']}
          rows={[
            [
              'Data subjects',
              "Customer's contacts and subscribers, recipients of Customer's emails, senders of email to Customer's receiving addresses, and any other individuals whose data Customer puts into the Service.",
            ],
            [
              'Personal data',
              'Email addresses; names and other contact fields Customer defines; subscription status; events Customer sends; email content and attachments; delivery events, and open and click events unless Customer switches tracking off; and related metadata.',
            ],
            ['Special categories', 'None intended. See section 2.4.'],
            [
              'Nature of the processing',
              'Storage, organisation, segmentation, sending and receiving of email, automation, event tracking, reporting, and deletion.',
            ],
            [
              'Purpose',
              'Providing the Service to Customer: sending transactional and marketing email and running automations on Customer’s behalf.',
            ],
            ['Frequency', 'Continuous, for the duration of the contract.'],
            [
              'Duration and retention',
              'For the duration of the contract and until deletion under section 10. The bodies and attachments of sent and received email are cleared automatically 90 days after the email is created; other Customer Personal Data is kept until Customer deletes it.',
            ],
          ]}
        />
      </LegalSection>

      <LegalSection id={'annex-2'} title={'Annex II: Technical and organisational measures'}>
        <GuideTable
          stack
          head={['Area', 'Measures']}
          rows={[
            [
              'Hosting',
              'Production systems run in ISO 27001-certified data centres in the European Union. Backups are taken every three hours, kept for at most a day, and stored separately with a provider that encrypts data at rest.',
            ],
            ['Encryption', 'Data is encrypted in transit with TLS. Passwords are stored only as salted hashes.'],
            [
              'Access control',
              'Administrative access is limited to people who need it to run the Service. API keys are scoped to a single project, and project members have roles.',
            ],
            ['Separation', 'Customer Data is logically separated by project.'],
            [
              'Abuse and attack prevention',
              'Rate limiting, bot protection at sign-in and sign-up, and automated monitoring of sending behaviour and content.',
            ],
            [
              'Logging and monitoring',
              'API requests and security events are logged and kept for 30 days. Alerts notify us of anomalies.',
            ],
            [
              'Data minimisation',
              'The bodies and attachments of sent and received email are cleared after 90 days. Open and click tracking can be switched off per project.',
            ],
            [
              'Maintenance',
              'Dependencies and systems are kept up to date. The source code is public, so its security can be reviewed by anyone.',
            ],
            ['Incidents', 'Personal data breaches are handled and notified as described in section 7.'],
          ]}
        />
      </LegalSection>

      <LegalSection id={'annex-3'} title={'Annex III: Sub-processors'}>
        <GuideTable
          stack
          head={['Sub-processor', 'Processing', 'Location', 'Transfer safeguard']}
          rows={[
            [
              'Hetzner Online GmbH',
              'Hosting of the application, database and file storage',
              'Germany',
              'Not needed (EU)',
            ],
            [
              'Amazon Web Services EMEA SARL',
              'Sending and receiving email, delivery notifications, backups',
              'Sweden (EU)',
              'Data Privacy Framework and Standard Contractual Clauses for any access from outside the EEA',
            ],

            [
              'Shipmail',
              'Support communications, when Customer shares personal data with us',
              'Germany',
              'Not needed (EU)',
            ],
          ]}
        />
      </LegalSection>
    </LegalLayout>
  );
}
