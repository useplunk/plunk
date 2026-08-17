import {NextSeo} from 'next-seo';
import React from 'react';
import {Navbar} from '../components';

export default function DataProcessingAgreement() {
  return (
    <>
      <NextSeo
        title="Plunk Data Processing Agreement (DPA) | GDPR Compliance"
        description="Data Processing Agreement for Plunk customers. GDPR-compliant DPA covering data processing activities, sub-processors, security measures, and data subject rights."
        openGraph={{
          title: 'Plunk Data Processing Agreement (DPA) | GDPR Compliance',
          description:
            'Data Processing Agreement for Plunk customers. GDPR-compliant DPA covering data processing activities, sub-processors, security measures, and data subject rights.',
        }}
        additionalMetaTags={[
          {
            property: 'title',
            content: 'Plunk Data Processing Agreement (DPA) | GDPR Compliance',
          },
        ]}
      />

      <div className="min-h-screen bg-white">
        <div className="px-8 pb-32 sm:px-12 md:px-16 lg:px-20 xl:px-24 2xl:px-56">
          <Navbar />

          <div className="mx-auto max-w-4xl py-16">
            {/* Hero */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-neutral-900">Data Processing Agreement</h1>
              <p className="mt-2 text-ui text-neutral-600">Last Updated: February 18, 2026</p>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                This Data Processing Agreement ("DPA") forms part of the Terms of Service between you ("Customer", "Data
                Controller") and Plunk ("Processor", "we", "us") and governs the processing of Personal Data in
                accordance with GDPR requirements.
              </p>
              <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-ui leading-relaxed text-blue-900">
                  <strong className="font-semibold">GDPR Requirement:</strong> This DPA is required under Article 28 of
                  the GDPR. By using Plunk's hosted service, you accept and agree to the terms of this DPA.
                </p>
              </div>
            </div>

            {/* Table of Contents */}
            <nav className="mb-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Contents</h2>
              <ol className="space-y-2 text-ui text-neutral-700">
                <li>
                  <a href="#definitions" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    1. Definitions
                  </a>
                </li>
                <li>
                  <a href="#scope" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    2. Scope & Applicability
                  </a>
                </li>
                <li>
                  <a href="#processing-details" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    3. Processing Details
                  </a>
                </li>
                <li>
                  <a href="#obligations" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    4. Data Processor Obligations
                  </a>
                </li>
                <li>
                  <a href="#security" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    5. Security Measures
                  </a>
                </li>
                <li>
                  <a href="#sub-processors" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    6. Sub-Processors
                  </a>
                </li>
                <li>
                  <a href="#data-subject-rights" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    7. Data Subject Rights
                  </a>
                </li>
                <li>
                  <a href="#data-breach" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    8. Data Breach Notification
                  </a>
                </li>
                <li>
                  <a href="#international-transfers" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    9. International Data Transfers
                  </a>
                </li>
                <li>
                  <a href="#audits" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    10. Audits & Compliance
                  </a>
                </li>
                <li>
                  <a href="#deletion" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    11. Data Deletion & Return
                  </a>
                </li>
                <li>
                  <a href="#liability" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    12. Liability & Indemnification
                  </a>
                </li>
                <li>
                  <a href="#term" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    13. Term & Termination
                  </a>
                </li>
              </ol>
            </nav>

            {/* Content Sections */}
            <div className="space-y-12">
              {/* Section 1 */}
              <section id="definitions" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">1. Definitions</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Terms used in this DPA have the meanings set forth in the GDPR. Specifically:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">"Personal Data"</strong> means any information
                    relating to an identified or identifiable natural person processed via Plunk
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">"Data Controller"</strong> means the Customer who
                    determines the purposes and means of processing Personal Data
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">"Data Processor"</strong> means Plunk, which
                    processes Personal Data on behalf of the Data Controller
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">"Sub-processor"</strong> means any third party
                    engaged by Plunk to process Personal Data
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">"Data Subject"</strong> means the individuals
                    whose Personal Data is processed (your contacts/subscribers)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">"GDPR"</strong> means Regulation (EU) 2016/679
                    (General Data Protection Regulation)
                  </li>
                </ul>
              </section>

              {/* Section 2 */}
              <section id="scope" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">2. Scope & Applicability</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Hosted Service Only</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  This DPA applies ONLY to customers using Plunk's hosted service (useplunk.com). Self-hosted
                  deployments are NOT covered by this DPA - you are solely responsible for GDPR compliance when
                  self-hosting.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Agreement Hierarchy</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  This DPA supplements the Plunk Terms of Service and Privacy Policy. In case of conflict regarding data
                  processing:
                </p>
                <ol className="mb-4 ml-6 list-decimal space-y-2 text-neutral-700">
                  <li>This DPA takes precedence</li>
                  <li>Then the Terms of Service</li>
                  <li>Then the Privacy Policy</li>
                </ol>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Acceptance</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  By using Plunk's hosted service, you acknowledge that you have read, understood, and agree to be bound
                  by this DPA. This constitutes a legally binding agreement between Customer and Plunk.
                </p>
              </section>

              {/* Section 3 */}
              <section id="processing-details" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">3. Processing Details</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  As required by GDPR Article 28(3), the following details describe the processing activities:
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Subject Matter</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Processing of Personal Data necessary to provide email automation, transactional email, marketing
                  campaigns, and workflow automation services.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Duration</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Processing occurs for the duration of your Plunk subscription/account, plus 30 days for API logs
                  (which are automatically deleted), and until you request account deletion.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Nature & Purpose</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Storing and managing contact databases</li>
                  <li>Sending transactional, marketing, and workflow-triggered emails</li>
                  <li>Tracking email delivery, opens, clicks, bounces, and complaints (per your settings)</li>
                  <li>Managing email templates and automation workflows</li>
                  <li>Processing email events and webhooks</li>
                  <li>Providing analytics and reporting</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Type of Personal Data</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email addresses (required)</li>
                  <li>Names and custom contact fields (optional, Customer-defined)</li>
                  <li>Email content (subject lines, message bodies, attachments)</li>
                  <li>Subscription status and preferences</li>
                  <li>Email activity data (opens, clicks, bounces, complaints)</li>
                  <li>Timestamps and metadata</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Categories of Data Subjects</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Customer's email subscribers and contacts</li>
                  <li>Recipients of transactional emails</li>
                  <li>Marketing campaign recipients</li>
                  <li>Workflow automation recipients</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="obligations" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">4. Data Processor Obligations</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk commits to the following obligations as Data Processor:
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Processing Instructions</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    Process Personal Data only on documented instructions from Customer (via API, dashboard, etc.)
                  </li>
                  <li>Not process Personal Data for any other purpose without Customer's prior written consent</li>
                  <li>Immediately inform Customer if instructions violate GDPR or other EU data protection laws</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Confidentiality</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Ensure persons authorized to process Personal Data are bound by confidentiality obligations</li>
                  <li>Maintain confidentiality of all Personal Data processed via Plunk</li>
                  <li>
                    Not disclose Personal Data to third parties except as required by law or with Customer consent
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Cooperation</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Assist Customer in responding to Data Subject rights requests (see Section 7)</li>
                  <li>
                    Assist Customer in ensuring compliance with GDPR security, breach notification, and impact
                    assessment obligations
                  </li>
                  <li>Provide information necessary to demonstrate compliance with Article 28</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section id="security" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">5. Security Measures</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  As required by GDPR Article 32, Plunk implements appropriate technical and organizational measures to
                  ensure a level of security appropriate to the risk:
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Technical Safeguards</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Industry-standard password hashing (never stored in plaintext)</li>
                  <li>HTTPS-only API access (TLS 1.2+)</li>
                  <li>Database connections encrypted via TLS/SSL</li>
                  <li>HttpOnly, secure cookies with appropriate SameSite settings</li>
                  <li>Authentication tokens with limited expiration periods</li>
                  <li>Rate limiting to prevent brute force attacks</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Organizational Safeguards</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Access controls limiting personnel access to Personal Data</li>
                  <li>Automated bounce and complaint rate monitoring</li>
                  <li>Regular security updates and patching</li>
                  <li>Data segregation by project (multi-tenancy with isolation)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Data Residency</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Primary data storage: EU/EEA (Hetzner infrastructure)</li>
                  <li>Database and file storage remain within EU/EEA</li>
                  <li>Email delivery may transit non-EU regions (see Section 9)</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="sub-processors" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">6. Sub-Processors</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Customer authorizes Plunk to engage the following sub-processors to process Personal Data:
                </p>

                <div className="mb-6 overflow-x-auto">
                  <table className="min-w-full border border-neutral-300">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="border border-neutral-300 px-4 py-2 text-left text-ui font-semibold text-neutral-900">
                          Sub-Processor
                        </th>
                        <th className="border border-neutral-300 px-4 py-2 text-left text-ui font-semibold text-neutral-900">
                          Service
                        </th>
                        <th className="border border-neutral-300 px-4 py-2 text-left text-ui font-semibold text-neutral-900">
                          Location
                        </th>
                        <th className="border border-neutral-300 px-4 py-2 text-left text-ui font-semibold text-neutral-900">
                          Purpose
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Amazon Web Services (AWS SES)
                        </td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">Email Delivery</td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Global (data in transit only)
                        </td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Sending emails to recipients
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">Stripe, Inc.</td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Payment Processing
                        </td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          USA (PCI-DSS compliant)
                        </td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Billing for paid accounts
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Hetzner Online GmbH
                        </td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Infrastructure Hosting
                        </td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          EU/EEA (Germany)
                        </td>
                        <td className="border border-neutral-300 px-4 py-2 text-ui text-neutral-700">
                          Database and application hosting
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Sub-Processor Obligations</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>All sub-processors are bound by data protection obligations equivalent to this DPA</li>
                  <li>Plunk remains fully liable to Customer for sub-processor performance</li>
                  <li>Sub-processors have executed Data Processing Agreements with Plunk</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Changes to Sub-Processors</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Plunk will provide 30 days advance notice of new or replacement sub-processors via email</li>
                  <li>Notice will be sent to the email address associated with your account</li>
                  <li>
                    If you object on reasonable grounds related to data protection, you may terminate your account
                    within 30 days
                  </li>
                  <li>Updated sub-processor list will be maintained on this page (check "Last Updated" date)</li>
                </ul>
              </section>

              {/* Section 7 */}
              <section id="data-subject-rights" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">7. Data Subject Rights</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk will assist Customer in fulfilling Data Subject rights requests under GDPR Articles 15-22:
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Self-Service via API</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Customer can fulfill most Data Subject requests independently via API:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Access (Art. 15):</strong> Retrieve contact data
                    via GET /contacts/:id
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Rectification (Art. 16):</strong> Update contact
                    data via PATCH /contacts/:id
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Erasure (Art. 17):</strong> Delete contact via
                    DELETE /contacts/:id
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Restriction (Art. 18):</strong> Update
                    subscription status to "unsubscribed"
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Portability (Art. 20):</strong> Use API to access
                    data in JSON format
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Assistance from Plunk</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  If Customer cannot fulfill a request via API, contact legal@useplunk.com:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Provide Data Subject's email address and nature of request</li>
                  <li>Plunk will respond within 10 business days with requested information or assistance</li>
                  <li>
                    Customer remains responsible for verifying Data Subject identity before disclosing information
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Email Activity Data</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email opens, clicks, bounces, and complaints are linked to contact records</li>
                  <li>Deleting a contact will cascade delete associated email activity</li>
                  <li>API logs (non-Personal Data) are automatically deleted after 30 days</li>
                </ul>
              </section>

              {/* Section 8 */}
              <section id="data-breach" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">8. Data Breach Notification</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Notification Obligation</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  In the event of a Personal Data breach affecting Customer data, Plunk will:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    Notify Customer without undue delay and within 72 hours of becoming aware of the breach (per GDPR
                    Art. 33)
                  </li>
                  <li>Send notification to the primary email address associated with Customer's account</li>
                  <li>Provide information to enable Customer to meet any GDPR breach reporting obligations</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Breach Information</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Notifications will include (to the extent known):
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Nature of the breach (what happened)</li>
                  <li>Categories and approximate number of Data Subjects affected</li>
                  <li>Categories and approximate number of Personal Data records affected</li>
                  <li>Likely consequences of the breach</li>
                  <li>Measures taken or proposed to address the breach and mitigate harm</li>
                  <li>Contact point for more information (legal@useplunk.com)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Customer Responsibility</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Customer is responsible for notifying their supervisory authority if required by GDPR Art. 33</li>
                  <li>Customer is responsible for notifying affected Data Subjects if required by GDPR Art. 34</li>
                  <li>Plunk's breach notification to Customer does NOT constitute legal or compliance advice</li>
                </ul>
              </section>

              {/* Section 9 */}
              <section id="international-transfers" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">9. International Data Transfers</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Primary Storage (EU/EEA)</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>All contact data, templates, workflows, and account data stored in EU/EEA (Hetzner, Germany)</li>
                  <li>No routine transfers of stored Personal Data outside EU/EEA</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Data in Transit (Email Delivery)</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  When emails are sent to recipients, Personal Data may transit through non-EU regions:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>AWS SES processes emails globally for delivery purposes</li>
                  <li>Data is in transit only (not stored long-term outside EU/EEA)</li>
                  <li>Protected by AWS Data Processing Agreement and Standard Contractual Clauses (SCCs)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Payment Data (Stripe)</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Payment information (credit cards) processed by Stripe (USA-based)</li>
                  <li>Stripe is PCI-DSS Level 1 certified</li>
                  <li>Protected by Stripe's Data Processing Agreement and Standard Contractual Clauses</li>
                  <li>Plunk does NOT store credit card numbers (tokenized by Stripe)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Standard Contractual Clauses</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  All sub-processors that process Personal Data outside EU/EEA have executed Standard Contractual
                  Clauses (SCCs) approved by the European Commission, providing appropriate safeguards for international
                  transfers per GDPR Article 46.
                </p>
              </section>

              {/* Section 10 */}
              <section id="audits" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">10. Audits & Compliance</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Information Provision</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk will make available to Customer information necessary to demonstrate compliance with GDPR
                  Article 28 obligations, including:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>This DPA (publicly available)</li>
                  <li>Privacy Policy describing processing activities</li>
                  <li>Sub-processor list (Section 6 above)</li>
                  <li>Security measures documentation (available upon reasonable request)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Audit Rights</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Customer may audit Plunk's compliance with this DPA, subject to the following:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Audits limited to once per year unless required by supervisory authority</li>
                  <li>Request must be submitted in writing to legal@useplunk.com with 30 days notice</li>
                  <li>Audits must be conducted by independent third-party auditors bound by confidentiality</li>
                  <li>Audits conducted during business hours with minimal disruption to operations</li>
                  <li>Customer bears all costs of audit</li>
                  <li>Audit scope limited to GDPR compliance (not general security assessments)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Alternative to Audits</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  In lieu of conducting a full audit, Customer may request and review sub-processor certifications and
                  compliance documentation (SOC 2, ISO 27001, etc.) where available.
                </p>
              </section>

              {/* Section 11 */}
              <section id="deletion" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">11. Data Deletion & Return</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Account Deletion</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  When Customer deletes their Plunk account (via dashboard or by request):
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>All Personal Data is immediately deleted from production systems</li>
                  <li>No grace period or recovery window (deletion is permanent)</li>
                  <li>
                    Customer should access or backup data via API before deletion (Plunk does NOT provide data export)
                  </li>
                  <li>Deletion includes: contacts, emails, templates, workflows, campaigns, and email activity</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Backup Retention</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Deleted data may remain in encrypted backups for up to 30 days for disaster recovery purposes</li>
                  <li>Backup data is not accessible or restorable after account deletion</li>
                  <li>Backups are automatically overwritten after retention period</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Legal Retention</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk may retain certain data if required by law (e.g., accounting records, fraud prevention):
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Billing records: Retained per tax/accounting laws (typically 7 years)</li>
                  <li>Fraud/abuse records: Retained for security purposes (email addresses of suspended accounts)</li>
                  <li>Legal requests: Data subject to legal holds retained as required by law</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">No Data Return</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk does NOT provide data export or return upon termination. Customer must retrieve data via API
                  before deleting account. Once deleted, data cannot be recovered.
                </p>
              </section>

              {/* Section 12 */}
              <section id="liability" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">12. Liability & Indemnification</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Customer Responsibilities</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">Customer (Data Controller) is responsible for:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    Ensuring lawful basis for processing under GDPR (consent, contract, legitimate interest, etc.)
                  </li>
                  <li>Obtaining necessary consents from Data Subjects before adding them to Plunk</li>
                  <li>Providing privacy notices to Data Subjects per GDPR Article 13/14</li>
                  <li>Complying with anti-spam laws (CAN-SPAM, CASL, GDPR, etc.)</li>
                  <li>Verifying Data Subject identity before fulfilling rights requests</li>
                  <li>Notifying supervisory authorities and Data Subjects of breaches where required</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Plunk's Liability</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Plunk is liable to Customer for compliance with this DPA and GDPR Article 28 obligations</li>
                  <li>Plunk is liable for sub-processor acts/omissions to the same extent as its own acts</li>
                  <li>
                    Liability limitations in Terms of Service apply, except where prohibited by GDPR (particularly Art.
                    82)
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Indemnification</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    Customer indemnifies Plunk for claims arising from Customer's violation of GDPR or data protection
                    laws
                  </li>
                  <li>
                    Plunk indemnifies Customer for claims arising solely from Plunk's breach of this DPA or GDPR Article
                    28
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">GDPR Fines</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Under GDPR Article 82(3), liability for damages is allocated between Controller and Processor based on
                  fault. Each party is liable only for the damage caused by its own GDPR violation.
                </p>
              </section>

              {/* Section 13 */}
              <section id="term" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">13. Term & Termination</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Effective Date</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  This DPA is effective as of the date you first use Plunk's hosted service and remains in effect for
                  the duration of the Terms of Service.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Termination</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">This DPA terminates automatically when:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Customer deletes their Plunk account</li>
                  <li>Terms of Service are terminated</li>
                  <li>All Personal Data has been deleted per Section 11</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Survival</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Obligations regarding confidentiality, data deletion, and liability survive termination to the extent
                  necessary to fulfill their purpose.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">DPA Updates</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Plunk may update this DPA to reflect changes in law, sub-processors, or processing activities</li>
                  <li>Material changes will be notified via email 30 days in advance</li>
                  <li>Continued use of Plunk after changes constitutes acceptance</li>
                  <li>Check "Last Updated" date at top of page for version tracking</li>
                </ul>
              </section>

              {/* Contact Section */}
              <section className="mb-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
                <h2 className="mb-4 text-xl font-semibold text-neutral-900">Questions or Requests?</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  For questions about this DPA, data processing activities, or to exercise audit rights:
                </p>
                <p className="mb-2 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Email:</strong> legal@useplunk.com
                </p>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Response Time:</strong> Within 10 business days
                </p>
                <p className="text-ui text-neutral-600">
                  For Data Subject rights requests, Customers should use the API (see Section 7) or contact
                  legal@useplunk.com with Data Subject's email address and nature of request.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
