import {NextSeo} from 'next-seo';
import Link from 'next/link';
import React from 'react';
import {Navbar} from '../components';

export default function TermsOfService() {
  return (
    <>
      <NextSeo
        title="Plunk Terms of Service | The Open-Source Email Platform"
        description="Terms of Service for Plunk, the open-source email automation platform. Read our user agreement, acceptable use policy, and email compliance requirements."
        openGraph={{
          title: 'Plunk Terms of Service | The Open-Source Email Platform',
          description:
            'Terms of Service for Plunk, the open-source email automation platform. Read our user agreement, acceptable use policy, and email compliance requirements.',
        }}
        additionalMetaTags={[
          {
            property: 'title',
            content: 'Plunk Terms of Service | The Open-Source Email Platform',
          },
        ]}
      />

      <div className="min-h-screen bg-white">
        <div className="px-8 pb-32 sm:px-12 md:px-16 lg:px-20 xl:px-24 2xl:px-56">
          <Navbar />

          <div className="mx-auto max-w-4xl py-16">
            {/* Hero */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-neutral-900">Terms of Service</h1>
              <p className="mt-2 text-ui text-neutral-600">Last Updated: February 18, 2026</p>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                Welcome to Plunk, the open-source email automation platform. These Terms of Service govern your use of
                Plunk's hosted service and self-hosted software.
              </p>
            </div>

            {/* Table of Contents */}
            <nav className="mb-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Contents</h2>
              <ol className="space-y-2 text-ui text-neutral-700">
                <li>
                  <a href="#acceptance" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    1. Acceptance of Terms
                  </a>
                </li>
                <li>
                  <a href="#service" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    2. Service Description
                  </a>
                </li>
                <li>
                  <a href="#account" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    3. Account Registration & Eligibility
                  </a>
                </li>
                <li>
                  <a href="#acceptable-use" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    4. Acceptable Use Policy
                  </a>
                </li>
                <li>
                  <a href="#email-compliance" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    5. Email Compliance & Anti-Spam
                  </a>
                </li>
                <li>
                  <a href="#billing" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    6. Billing & Payments
                  </a>
                </li>
                <li>
                  <a href="#data-ownership" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    7. Data Ownership & Privacy
                  </a>
                </li>
                <li>
                  <a href="#intellectual-property" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    8. Intellectual Property
                  </a>
                </li>
                <li>
                  <a href="#availability" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    9. Service Availability & Limitations
                  </a>
                </li>
                <li>
                  <a href="#termination" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    10. Termination
                  </a>
                </li>
                <li>
                  <a href="#liability" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    11. Liability & Warranties
                  </a>
                </li>
                <li>
                  <a href="#disputes" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    12. Dispute Resolution
                  </a>
                </li>
                <li>
                  <a href="#changes" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    13. Changes to Terms
                  </a>
                </li>
                <li>
                  <a href="#self-hosted" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    14. Self-Hosted Deployments
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    15. Contact Information
                  </a>
                </li>
              </ol>
            </nav>

            {/* Content */}
            <div className="prose prose-neutral max-w-none">
              {/* Section 1 */}
              <section id="acceptance" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">1. Acceptance of Terms</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  By accessing or using Plunk ("Service"), you agree to be bound by these Terms of Service ("Terms"). If
                  you disagree with any part of these Terms, you may not use the Service.
                </p>
                <p className="mb-4 leading-relaxed text-neutral-700">These Terms apply to:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Hosted service at useplunk.com (SaaS)</li>
                  <li>Self-hosted deployments (governed by AGPL v3 License + these Terms)</li>
                  <li>All APIs, dashboards, and email infrastructure</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section id="service" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">2. Service Description</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk is an email automation platform that enables you to:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Send transactional and marketing emails</li>
                  <li>Manage contact lists and segments</li>
                  <li>Create email campaigns and workflows</li>
                  <li>Track email performance and analytics</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Service Models</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Hosted SaaS:</strong> We manage infrastructure,
                  updates, and scaling. Available at useplunk.com.
                </p>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Self-Hosted:</strong> You deploy and manage your
                  own instance. Software available under AGPL v3 License at github.com/useplunk/plunk.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Email Delivery</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk uses third-party email delivery infrastructure. Service availability depends on these providers'
                  uptime and quota limits.
                </p>
              </section>

              {/* Section 3 */}
              <section id="account" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">3. Account Registration & Eligibility</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Age Requirement</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  You must be at least 16 years old to use Plunk. By creating an account, you represent that you meet
                  this age requirement.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Account Security</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>You are responsible for maintaining account confidentiality</li>
                  <li>Use a strong password (minimum 6 characters, stored as bcrypt hash)</li>
                  <li>Do not share credentials with others</li>
                  <li>Notify us immediately of any unauthorized access</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Email Verification</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Email verification may be required based on deployment configuration. OAuth providers (Google, GitHub)
                  are automatically verified.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Multiple Users</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Projects support multiple members with role-based access. Each member must have their own account.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Account Information</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Provide accurate, current, and complete information. Update information promptly when changes occur.
                </p>
              </section>

              {/* Section 4 */}
              <section id="acceptable-use" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">4. Acceptable Use Policy</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">You may NOT use Plunk to:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Send spam or unsolicited bulk emails</li>
                  <li>Violate anti-spam laws (CAN-SPAM, GDPR, CASL, etc.)</li>
                  <li>Send emails containing illegal content</li>
                  <li>Distribute malware, viruses, or malicious code</li>
                  <li>Harass, threaten, or abuse recipients</li>
                  <li>Impersonate others or misrepresent sender identity</li>
                  <li>Send phishing or fraudulent emails</li>
                  <li>Violate third-party intellectual property rights</li>
                  <li>Interfere with platform security or performance</li>
                  <li>Circumvent rate limits or usage restrictions</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Content Restrictions</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>No illegal pornography or adult content</li>
                  <li>No hate speech or discriminatory content</li>
                  <li>No violent threats or terrorism</li>
                  <li>No illegal gambling or controlled substances</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Your Responsibilities</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">You are responsible for:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>All content sent through your account</li>
                  <li>Compliance with applicable laws in your jurisdiction</li>
                  <li>Ensuring recipients can unsubscribe from marketing emails</li>
                </ul>
              </section>

              {/* Section 5 - Critical Email Compliance */}
              <section id="email-compliance" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">5. Email Compliance & Anti-Spam</h2>
                <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-6">
                  <h3 className="mb-3 text-h3 font-bold text-red-900">NO COLD EMAILING POLICY</h3>
                  <p className="mb-4 leading-relaxed text-red-900">
                    Plunk strictly prohibits cold emailing. All emails must be sent to recipients who have:
                  </p>
                  <ul className="ml-6 list-disc space-y-2 text-red-900">
                    <li>
                      <strong>Explicitly opted in</strong> to receive emails from you, OR
                    </li>
                    <li>
                      <strong>An existing business relationship</strong> with you (for transactional emails only)
                    </li>
                  </ul>
                </div>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Required Consent</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Prior express consent (opt-in forms, checkboxes, subscriptions)</li>
                  <li>Documented consent records (signup date, IP address, opt-in method)</li>
                  <li>Double opt-in is strongly recommended</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Prohibited Activities</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>✗ Purchasing or renting email lists</li>
                  <li>✗ Scraping email addresses from websites</li>
                  <li>✗ Sending emails without documented consent</li>
                  <li>✗ Using third-party lists without verified opt-ins</li>
                  <li>✗ "One-time" cold outreach emails</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Unsubscribe Requirements</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Marketing emails MUST include an unsubscribe link</li>
                  <li>Unsubscribe requests must be honored immediately</li>
                  <li>Do not require login to unsubscribe</li>
                  <li>Transactional emails may omit unsubscribe (but must be truly transactional)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Sender Reputation Monitoring</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk monitors email bounce and complaint rates to maintain service quality and sender reputation.
                  Projects with excessive bounce or complaint rates may receive warnings or be automatically suspended
                  to protect our email infrastructure and delivery capabilities.
                </p>

                <p className="mb-4 leading-relaxed text-neutral-700">If your project is suspended:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email sending is immediately disabled</li>
                  <li>You will receive notification at your registered email</li>
                  <li>You must remediate issues before reactivation</li>
                  <li>Repeated violations may result in permanent termination</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Legal Compliance</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">You must comply with applicable anti-spam laws:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">CAN-SPAM Act (USA):</strong> Include physical
                    address, accurate headers, unsubscribe option
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">GDPR (EU):</strong> Obtain consent, honor data
                    rights, provide privacy policy
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">CASL (Canada):</strong> Obtain express consent,
                    identify sender, provide unsubscribe
                  </li>
                  <li>Other jurisdictions: Comply with local anti-spam laws</li>
                </ul>

                <p className="leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">
                    You are solely responsible for legal compliance in your jurisdiction.
                  </strong>
                </p>
              </section>

              {/* Section 6 */}
              <section id="billing" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">6. Billing & Payments</h2>
                <p className="mb-4 text-ui italic text-neutral-600">(SaaS Only - Not applicable to self-hosted)</p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Pay-As-You-Go Model</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Usage-based billing calculated after usage</li>
                  <li>Charges based on emails sent (transactional, campaigns, workflows)</li>
                  <li>No monthly subscriptions (usage billing only)</li>
                  <li>Free tier available (1,000 emails/month total across all email types)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Payment Processing</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Payments processed via Stripe (PCI-DSS compliant)</li>
                  <li>Credit/debit cards accepted</li>
                  <li>Billing occurs after usage is calculated</li>
                  <li>Invoices available in dashboard</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Activation Charges</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Activating a subscription places two charges of 1.00, in your billing currency, on your card: a
                  one-time onboarding fee, and a card verification charge made immediately afterwards to confirm your
                  card accepts automatic recurring billing. Both amounts are credited in full to your account balance
                  and applied against your usage, so activation carries no net cost. If the verification charge is
                  declined, the second charge is not completed, the onboarding fee is refunded in full, and your
                  subscription is cancelled.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">No Refunds</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Due to the pay-as-you-go nature of our service, refunds are not offered on usage charges. Usage is
                  calculated and billed after emails are sent. Disputes must be raised within 30 days of charge. The
                  sole exception is the onboarding fee, which is refunded in full if card verification fails during
                  activation, as described above.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Usage Limits</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Rate limits apply to protect service stability</li>
                  <li>Projects may be throttled if limits are exceeded</li>
                  <li>Contact legal@useplunk.com for quota increases</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Non-Payment</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Overdue accounts may be suspended after 14 days</li>
                  <li>Service restored upon payment</li>
                  <li>Data retained for 30 days after suspension</li>
                </ul>
              </section>

              {/* Section 7 */}
              <section id="data-ownership" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">7. Data Ownership & Privacy</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Your Data Ownership</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>You own all contact data, email content, and custom fields</li>
                  <li>Plunk never sells or shares your data with third parties</li>
                  <li>You can access and delete your data at any time via the dashboard or API</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Plunk's Role (GDPR Context)</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Data Controller:</strong> For your account
                    information (email, password)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Data Processor:</strong> For your contact data
                    (we process on your behalf)
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Privacy</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    Full details in our{' '}
                    <Link href="/privacy" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>EU/EEA data residency (Hetzner infrastructure)</li>
                  <li>GDPR-compliant data processing</li>
                  <li>Immediate deletion upon request (no grace period)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Data Portability</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Export contacts as JSON via API</li>
                  <li>Export email templates and workflows</li>
                  <li>Export analytics and event data</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Self-Hosted</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>You are the data controller for your instance</li>
                  <li>You are responsible for GDPR compliance</li>
                  <li>You control data retention and deletion policies</li>
                </ul>
              </section>

              {/* Section 8 */}
              <section id="intellectual-property" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">8. Intellectual Property</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Plunk Software (AGPL v3 License)</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Core platform is open-source under AGPL v3 License</li>
                  <li>Available at github.com/useplunk/plunk</li>
                  <li>You may modify, distribute, and use per AGPL v3 terms</li>
                  <li>AGPL v3 License terms govern software usage</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Plunk Trademarks</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>"Plunk" name and logo are trademarks</li>
                  <li>Requires permission for commercial use beyond software usage</li>
                  <li>Attribution required for self-hosted deployments</li>
                  <li>"Powered by Plunk" badge (removable with subscription)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Your Content</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>You retain all rights to content you create (emails, templates, workflows)</li>
                  <li>You grant Plunk a license to process content for service delivery</li>
                  <li>No ownership transfer to Plunk</li>
                </ul>
              </section>

              {/* Section 9 */}
              <section id="availability" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">9. Service Availability & Limitations</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Best-Effort Delivery</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email delivery is not guaranteed 100%</li>
                  <li>Depends on recipient servers, spam filters, and email delivery infrastructure</li>
                  <li>No SLA for uptime or delivery rates (hosted service)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Limitations</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Rate limits apply to protect service stability</li>
                  <li>Storage limits may apply</li>
                  <li>API rate limiting to prevent abuse</li>
                  <li>Bounce/complaint monitoring may suspend projects</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Force Majeure</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">Not liable for service interruptions due to:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email delivery infrastructure outages or quota issues</li>
                  <li>Internet connectivity problems</li>
                  <li>Natural disasters or acts of God</li>
                  <li>Government actions or legal requirements</li>
                  <li>Cyber attacks or security incidents</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Maintenance</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Scheduled maintenance with advance notice</li>
                  <li>Emergency maintenance may occur without notice</li>
                </ul>
              </section>

              {/* Section 10 */}
              <section id="termination" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">10. Termination</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Your Right to Terminate</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Cancel account at any time via dashboard</li>
                  <li>No cancellation fees</li>
                  <li>Pay-as-you-go charges apply up to cancellation date</li>
                  <li>Data is immediately deleted (no recovery period)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Our Right to Terminate</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We may suspend or terminate your account for:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Violation of these Terms (especially Acceptable Use Policy)</li>
                  <li>Fraudulent activity or payment disputes</li>
                  <li>Abuse of service or security threats</li>
                  <li>Excessive bounce/complaint rates</li>
                  <li>Non-payment after 30 days</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Effect of Termination</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Access to service immediately revoked</li>
                  <li>All data permanently deleted (no backups retained)</li>
                  <li>In-flight campaigns/workflows are cancelled</li>
                  <li>No refunds for unused time or credits</li>
                </ul>
              </section>

              {/* Section 11 */}
              <section id="liability" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">11. Liability & Warranties</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">No Warranties</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Service provided "AS-IS" without warranties of any kind, express or implied, including but not limited
                  to:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>No guarantee of uptime, delivery rates, or data accuracy</li>
                  <li>No warranty of merchantability or fitness for a particular purpose</li>
                  <li>No warranty of uninterrupted or error-free operation</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Limitation of Liability</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  To the maximum extent permitted by law, Plunk's total liability is limited to the fees you paid in the
                  last 12 months. We are not liable for:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Indirect, consequential, or punitive damages</li>
                  <li>Lost profits, data loss, or business interruption</li>
                  <li>Third-party claims arising from your use of the service</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Indemnification</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  You agree to indemnify and hold Plunk harmless from claims arising from:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Your use of the service</li>
                  <li>Violation of these Terms (especially email compliance requirements)</li>
                  <li>Violation of third-party rights</li>
                  <li>Unlawful or fraudulent activity</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Exceptions</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Liability cannot be limited for willful misconduct, gross negligence, or where prohibited by law.
                  Consumer protection laws may override these limitations.
                </p>
              </section>

              {/* Section 12 */}
              <section id="disputes" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">12. Dispute Resolution</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Governing Law</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  These Terms are governed by the laws of the European Union. Disputes are subject to EU consumer
                  protection laws.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Negotiation</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Parties agree to good-faith negotiation before litigation. Contact legal@useplunk.com to initiate
                  dispute resolution. 30-day negotiation period required.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Jurisdiction</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Courts of the European Union have jurisdiction. You may also bring claims in your country of residence
                  (EU consumer rights).
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Class Action Waiver</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Disputes resolved individually, not as class actions, unless prohibited by law.
                </p>
              </section>

              {/* Section 13 */}
              <section id="changes" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">13. Changes to Terms</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Modification Rights</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk may update these Terms at any time. Material changes will be announced via:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email notification to registered users</li>
                  <li>Notice on website homepage</li>
                  <li>Updated "Last Updated" date</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Notice Period</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>30 days notice for material changes</li>
                  <li>Immediate effect for non-material changes (typos, clarifications)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Acceptance</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Continued use after changes constitutes acceptance. If you disagree, you must stop using the service.
                </p>
              </section>

              {/* Section 14 */}
              <section id="self-hosted" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">14. Self-Hosted Deployments</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">AGPL v3 License Governs</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Self-hosted software use governed by AGPL v3 License</li>
                  <li>Available at github.com/useplunk/plunk/LICENSE</li>
                  <li>These Terms supplement (not replace) AGPL v3 License</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Your Responsibilities</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Infrastructure management and scaling</li>
                  <li>Security updates and patching</li>
                  <li>Database backups and disaster recovery</li>
                  <li>Compliance with anti-spam laws (Sections 4 & 5 still apply)</li>
                  <li>Email delivery infrastructure account and quota management</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">No Support</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Community support only (GitHub Discussions)</li>
                  <li>No SLA or uptime guarantees</li>
                  <li>Paid support may be available on request</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Compliance</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>You must comply with Section 4 (Acceptable Use) and Section 5 (Email Compliance)</li>
                  <li>You are the data controller and responsible for GDPR compliance</li>
                  <li>You must create your own Privacy Policy for your users</li>
                </ul>
              </section>

              {/* Section 15 */}
              <section id="contact" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">15. Contact Information</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">Questions or concerns about these Terms?</p>

                <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
                  <p className="mb-2 font-semibold text-neutral-900">Legal Inquiries:</p>
                  <p className="mb-1 text-neutral-700">
                    Email:{' '}
                    <a href="mailto:legal@useplunk.com" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                      legal@useplunk.com
                    </a>
                  </p>
                  <p className="text-ui text-neutral-600">Response time: Within 7 business days</p>
                </div>

                <p className="mb-2 font-semibold text-neutral-900">Technical Support:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    Community:{' '}
                    <a
                      href="https://github.com/useplunk/plunk/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                    >
                      GitHub Discussions
                    </a>
                  </li>
                  <li>
                    Discord:{' '}
                    <Link href="/discord" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                      useplunk.com/discord
                    </Link>
                  </li>
                </ul>

                <p className="mb-2 font-semibold text-neutral-900">Privacy Requests:</p>
                <p className="text-neutral-700">
                  See our{' '}
                  <Link href="/privacy" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    Privacy Policy
                  </Link>{' '}
                  or email legal@useplunk.com
                </p>
              </section>
            </div>

            {/* Footer CTA */}
            <div className="mt-16 rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
              <p className="mb-2 text-lg font-semibold text-neutral-900">Questions about these Terms?</p>
              <p className="mb-4 text-neutral-700">
                We're here to help. Contact us at{' '}
                <a href="mailto:legal@useplunk.com" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                  legal@useplunk.com
                </a>
              </p>
              <p className="text-ui text-neutral-600">
                For privacy-related inquiries, please review our{' '}
                <Link href="/privacy" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
