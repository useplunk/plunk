import {NextSeo} from 'next-seo';
import Link from 'next/link';
import React from 'react';
import {Navbar} from '../components';

export default function PrivacyPolicy() {
  return (
    <>
      <NextSeo
        title="Plunk Privacy Policy | The Open-Source Email Platform"
        description="Privacy Policy for Plunk, the open-source email platform. Learn how we handle and protect your data with EU-hosted infrastructure and privacy-first design."
        openGraph={{
          title: 'Plunk Privacy Policy | The Open-Source Email Platform',
          description:
            'Privacy Policy for Plunk, the open-source email platform. Learn how we handle and protect your data with EU-hosted infrastructure and privacy-first design.',
        }}
        additionalMetaTags={[
          {
            property: 'title',
            content: 'Plunk Privacy Policy | The Open-Source Email Platform',
          },
        ]}
      />

      <div className="min-h-screen bg-white">
        <div className="px-8 pb-32 sm:px-12 md:px-16 lg:px-20 xl:px-24 2xl:px-56">
          <Navbar />

          <div className="mx-auto max-w-4xl py-16">
            {/* Hero */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-neutral-900">Privacy Policy</h1>
              <p className="mt-2 text-ui text-neutral-600">Last Updated: February 18, 2026</p>
              <p className="mt-4 text-base leading-relaxed text-neutral-700">
                This Privacy Policy explains how Plunk collects, uses, stores, and protects your personal information.
                We are committed to transparency and your privacy rights under GDPR and EU law.
              </p>
            </div>

            {/* Table of Contents */}
            <nav className="mb-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Contents</h2>
              <ol className="space-y-2 text-ui text-neutral-700">
                <li>
                  <a href="#introduction" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    1. Introduction & Data Controller
                  </a>
                </li>
                <li>
                  <a href="#data-collect" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    2. Data We Collect
                  </a>
                </li>
                <li>
                  <a href="#data-use" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    3. How We Use Your Data
                  </a>
                </li>
                <li>
                  <a href="#legal-basis" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    4. Legal Basis for Processing (GDPR)
                  </a>
                </li>
                <li>
                  <a href="#data-storage" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    5. Data Storage & Security
                  </a>
                </li>
                <li>
                  <a href="#data-sharing" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    6. Data Sharing & Sub-Processors
                  </a>
                </li>
                <li>
                  <a href="#data-retention" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    7. Data Retention
                  </a>
                </li>
                <li>
                  <a href="#your-rights" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    8. Your Rights Under GDPR
                  </a>
                </li>
                <li>
                  <a href="#email-tracking" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    9. Email Tracking
                  </a>
                </li>
                <li>
                  <a href="#cookies" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    10. Cookies & Local Storage
                  </a>
                </li>
                <li>
                  <a href="#international" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    11. International Data Transfers
                  </a>
                </li>
                <li>
                  <a href="#children" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    12. Children's Privacy
                  </a>
                </li>
                <li>
                  <a href="#self-hosted" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    13. Self-Hosted Deployments
                  </a>
                </li>
                <li>
                  <a href="#policy-changes" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    14. Changes to Privacy Policy
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
              <section id="introduction" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">1. Introduction & Data Controller</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Who We Are</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk is an open-source email automation platform. For the hosted service at useplunk.com, we act as:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Data Controller:</strong> For your account data
                    (email, password, billing)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Data Processor:</strong> For your contact data
                    (we process on your behalf)
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Contact Information</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Email:{' '}
                  <a href="mailto:legal@useplunk.com" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                    legal@useplunk.com
                  </a>
                  <br />
                  Response time: 7 business days (30 days for GDPR requests)
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">This Policy Covers</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Hosted service at useplunk.com (SaaS)</li>
                  <li>Data processing practices for EU/EEA users</li>
                  <li>Your rights under GDPR</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">This Policy Does NOT Cover</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Self-hosted deployments (you are the data controller)</li>
                  <li>Third-party services you integrate with Plunk</li>
                  <li>Websites linked from Plunk</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section id="data-collect" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">2. Data We Collect</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  2.1 Account Data (We are the Controller)
                </h3>
                <p className="mb-4 leading-relaxed text-neutral-700">When you create an account, we collect:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email address (required for login and notifications)</li>
                  <li>Password (securely hashed, never stored in plaintext)</li>
                  <li>Authentication method (password, Google OAuth, GitHub OAuth)</li>
                  <li>Account creation date and last login</li>
                  <li>Email verification status</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">OAuth Users:</strong> If you sign up via
                  Google/GitHub, we receive:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email address</li>
                  <li>OAuth provider ID (no password stored)</li>
                  <li>Auto-verified email status</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">We DO NOT collect:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Name (optional, not required)</li>
                  <li>Phone number</li>
                  <li>Physical address</li>
                  <li>Payment card details (handled by Stripe)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  2.2 Contact Data (You are the Controller, we are the Processor)
                </h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  When you add contacts to your projects, you provide:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Contact email addresses</li>
                  <li>Custom fields (stored as JSON: name, company, preferences, etc.)</li>
                  <li>Subscription status (subscribed/unsubscribed)</li>
                  <li>Contact creation and update timestamps</li>
                  <li>Locale/language preferences</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">System Fields (Reserved):</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>plunk_id (unique identifier)</li>
                  <li>plunk_email (email address)</li>
                  <li>unsubscribeUrl (auto-generated)</li>
                </ul>

                <div className="my-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-ui leading-relaxed text-blue-900">
                    <strong className="font-semibold">Important:</strong> YOU control what data to collect from your
                    contacts. WE process this data on your behalf (data processor role). YOU are responsible for
                    obtaining consent from your contacts.
                  </p>
                </div>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">2.3 Email Activity Data</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">For emails sent through Plunk, we track:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email subject and rendered HTML body</li>
                  <li>Sender and recipient addresses</li>
                  <li>Send timestamp and delivery status</li>
                  <li>Email delivery message ID (for tracking)</li>
                  <li>Delivery events: sent, delivered, opened, clicked, bounced, complained</li>
                  <li>Open count and click count (aggregated)</li>
                  <li>Bounce and complaint timestamps</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">Tracking depends on your project settings:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Enabled:</strong> Track all emails
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Disabled:</strong> No tracking
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Marketing Only:</strong> Track
                    campaigns/workflows, not transactional
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  2.4 API Request Logs (30-Day Retention)
                </h3>
                <p className="mb-4 leading-relaxed text-neutral-700">For security and debugging, we log:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>HTTP method, path, status code</li>
                  <li>Request duration and timestamp</li>
                  <li>IP address and user-agent</li>
                  <li>Project ID and user ID (if authenticated)</li>
                  <li>Error codes and messages</li>
                  <li>Request/response size</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Retention:</strong> Automatically deleted after 30
                  days
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  2.5 Usage Analytics (Internal Only)
                </h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We collect aggregated, non-personal analytics:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Number of emails sent per project</li>
                  <li>Campaign and workflow performance metrics</li>
                  <li>Feature usage statistics (anonymized)</li>
                  <li>Error rates and performance metrics</li>
                </ul>

                <div className="my-6 rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-2 text-ui font-semibold text-green-900">We DO NOT use:</p>
                  <ul className="ml-6 list-disc space-y-1 text-ui text-green-900">
                    <li>Google Analytics</li>
                    <li>Facebook Pixel</li>
                    <li>Third-party tracking scripts</li>
                    <li>Cross-site tracking cookies</li>
                  </ul>
                </div>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">2.6 Cookies & Local Storage</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Authentication Cookie (next_token):</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Purpose: Store JWT token for dashboard login</li>
                  <li>Duration: 7 days</li>
                  <li>Type: Essential, httpOnly, secure (HTTPS only)</li>
                  <li>Scope: API host only</li>
                  <li>Can be deleted: Yes (logout clears cookie)</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">No Tracking Cookies:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>No third-party cookies</li>
                  <li>No analytics cookies</li>
                  <li>No advertising cookies</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Browser Local Storage:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>UI preferences (theme, collapsed sidebar, etc.)</li>
                  <li>Stored client-side only, never sent to server</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section id="data-use" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">3. How We Use Your Data</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">3.1 Service Delivery</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We use your data to:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Authenticate you and maintain your session (JWT tokens)</li>
                  <li>Send emails on your behalf via AWS SES</li>
                  <li>Store and manage your contact lists</li>
                  <li>Process campaigns and workflow automation</li>
                  <li>Track email performance (if enabled)</li>
                  <li>Display analytics and reports</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">3.2 Billing & Payments</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">For paid usage:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Calculate usage-based charges (emails sent)</li>
                  <li>Process payments via Stripe</li>
                  <li>Send invoices and receipts</li>
                  <li>Detect fraudulent activity</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">3.3 Security & Compliance</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We monitor:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Bounce and complaint rates (sender reputation)</li>
                  <li>API abuse and rate limit violations</li>
                  <li>Suspicious login attempts</li>
                  <li>Spam or policy violations</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">Actions we may take:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Suspend projects with excessive bounces/complaints</li>
                  <li>Block malicious IP addresses</li>
                  <li>Require email verification for suspicious signups</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">3.4 Communication</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We may contact you for:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Service announcements (downtime, maintenance)</li>
                  <li>Security alerts (unusual activity, data breaches)</li>
                  <li>Policy changes (Terms, Privacy Policy)</li>
                  <li>Billing issues (payment failures, quota warnings)</li>
                  <li>Compliance notifications (project suspended)</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">We DO NOT send:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Marketing emails (unless you explicitly opt in)</li>
                  <li>Product updates (unless you subscribe)</li>
                  <li>Third-party promotions</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">3.5 Legal Obligations</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We may use or disclose data to:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Comply with subpoenas or court orders</li>
                  <li>Enforce our Terms of Service</li>
                  <li>Protect rights and safety of users</li>
                  <li>Prevent fraud or illegal activity</li>
                </ul>
              </section>

              {/* Section 4 */}
              <section id="legal-basis" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">4. Legal Basis for Processing (GDPR)</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">Under GDPR, we process your data based on:</p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  4.1 Contract Performance (GDPR Art. 6(1)(b))
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Account creation and authentication</li>
                  <li>Email sending and delivery</li>
                  <li>Billing and payment processing</li>
                  <li>Service support and maintenance</li>
                </ul>
                <p className="mb-4 leading-relaxed text-neutral-700">You cannot use Plunk without this processing.</p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  4.2 Legitimate Interests (GDPR Art. 6(1)(f))
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Security monitoring and fraud prevention</li>
                  <li>Service improvements and bug fixes</li>
                  <li>Usage analytics (anonymized)</li>
                  <li>Sender reputation monitoring (bounce/complaint rates)</li>
                </ul>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  You can object to this processing (email legal@useplunk.com).
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  4.3 Legal Obligation (GDPR Art. 6(1)(c))
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Compliance with anti-spam laws</li>
                  <li>Response to legal requests (subpoenas)</li>
                  <li>Tax and financial reporting</li>
                  <li>Data breach notifications</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">4.4 Consent (GDPR Art. 6(1)(a))</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Marketing emails from Plunk (if you opt in)</li>
                  <li>Optional features requiring consent</li>
                </ul>
                <p className="mb-4 leading-relaxed text-neutral-700">You can withdraw consent at any time.</p>
              </section>

              {/* Section 5 */}
              <section id="data-storage" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">5. Data Storage & Security</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">5.1 Data Location</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  All data is stored in the European Union / European Economic Area:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Primary infrastructure: Hetzner (Germany-based hosting)</li>
                  <li>Database: PostgreSQL with encrypted connections (TLS)</li>
                  <li>Redis cache: In-memory, ephemeral data only</li>
                  <li>Backups: EU/EEA locations</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">No data stored in:</strong> USA, China, or non-EU
                  countries (except AWS SES for email transit)
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">5.2 Security Measures</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Technical safeguards:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Password hashing: Industry-standard secure hashing</li>
                  <li>Cookies: httpOnly, secure, SameSite=Lax for same-site deployments</li>
                  <li>Database: TLS/SSL encrypted connections</li>
                  <li>API: HTTPS-only (TLS 1.2+)</li>
                  <li>JWT tokens: 7-day expiration, httpOnly cookies</li>
                  <li>Rate limiting: Protection against brute force attacks</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Organizational safeguards:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Access control: Limited personnel access to production data</li>
                  <li>Logging: 30-day API request logs for security audits</li>
                  <li>Monitoring: Automated alerts for suspicious activity</li>
                  <li>Open-source: Code is auditable (github.com/useplunk/plunk)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">5.3 Data Breach Notification</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">In case of a data breach:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>We will notify affected users within 72 hours (GDPR requirement)</li>
                  <li>Notification sent to registered email address</li>
                  <li>Disclosure of affected data categories</li>
                  <li>Recommended actions to protect yourself</li>
                </ul>
              </section>

              {/* Section 6 */}
              <section id="data-sharing" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">6. Data Sharing & Sub-Processors</h2>
                <div className="my-6 rounded-lg border-2 border-neutral-200 bg-neutral-50 p-6">
                  <p className="text-lg font-bold text-blue-900">We DO NOT sell your data. Ever.</p>
                </div>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  We share data only with trusted sub-processors necessary for service delivery:
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">6.1 Amazon Web Services (AWS SES)</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Purpose:</strong> Email delivery (SMTP relay)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Data shared:</strong> Sender/recipient emails,
                    subject, body, attachments
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Location:</strong> Data in transit only (not
                    stored by delivery provider)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Protection:</strong> AWS DPA (Data Processing
                    Agreement) and Standard Contractual Clauses
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Learn more:</strong>{' '}
                    <a
                      href="https://aws.amazon.com/ses/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                    >
                      aws.amazon.com/ses/
                    </a>
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">6.2 Stripe</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Purpose:</strong> Payment processing
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Data shared:</strong> Billing email, usage
                    amounts, transaction history
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Location:</strong> Global (PCI-DSS Level 1
                    certified)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Protection:</strong> Stripe DPA and PCI
                    compliance
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Learn more:</strong>{' '}
                    <a
                      href="https://stripe.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                    >
                      stripe.com/privacy
                    </a>
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">6.3 Hetzner</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Purpose:</strong> Infrastructure hosting
                    (servers, database, storage)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Data shared:</strong> All application data
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Location:</strong> EU/EEA (Germany data centers)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Protection:</strong> GDPR-compliant, EU-based
                    provider
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Learn more:</strong>{' '}
                    <a
                      href="https://hetzner.com/legal/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                    >
                      hetzner.com/legal/privacy-policy
                    </a>
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">NO OTHER THIRD PARTIES</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>No analytics providers (Google Analytics, Mixpanel, etc.)</li>
                  <li>No advertising networks</li>
                  <li>No data brokers or marketers</li>
                  <li>No social media tracking pixels</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">6.4 Legal Disclosures</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We may disclose data if required by:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Court orders or subpoenas</li>
                  <li>Law enforcement requests (with valid legal process)</li>
                  <li>National security demands (with applicable legal protections)</li>
                  <li>Emergency situations (immediate harm prevention)</li>
                </ul>
                <p className="mb-4 leading-relaxed text-neutral-700">We will notify you unless legally prohibited.</p>
              </section>

              {/* Section 7 */}
              <section id="data-retention" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">7. Data Retention</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">7.1 Account Data</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Retained:</strong> Until you delete your account
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Deletion:</strong> Immediate and permanent (no
                    grace period)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Backups:</strong> Removed from backups within 30
                    days
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">7.2 Contact Data</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Retained:</strong> Until you delete contacts or
                    your account
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Your control:</strong> Delete individual contacts
                    or bulk delete
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">No automatic deletion:</strong> We never delete
                    your contacts
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">7.3 Email Activity Data</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Retained:</strong> Indefinitely (for analytics
                    and deliverability tracking)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Includes:</strong> Open rates, click rates,
                    bounce history
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Purpose:</strong> Workflow triggers, campaign
                    performance, sender reputation
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">7.4 API Request Logs</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    <strong className="font-semibold text-neutral-900">Retained:</strong> 30 days (automatic deletion)
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Purpose:</strong> Security audits and debugging
                  </li>
                  <li>
                    <strong className="font-semibold text-neutral-900">Deletion:</strong> Daily cleanup job removes logs
                    older than 30 days
                  </li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">7.5 Deleted Account Data</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Account deletion is immediate</li>
                  <li>No recovery period or "soft delete"</li>
                  <li>
                    All associated data deleted: contacts, campaigns, workflows, email history, API keys, projects
                  </li>
                  <li>Billing records retained for legal compliance (varies by jurisdiction)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">7.6 Legal Retention</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Financial records: Retained for tax compliance</li>
                  <li>Subpoena responses: Retained as legally required</li>
                </ul>
              </section>

              {/* Section 8 */}
              <section id="your-rights" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">8. Your Rights Under GDPR</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  As an EU/EEA resident, you have the following rights:
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">8.1 Right to Access (Art. 15)</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Request a copy of all personal data we hold about you</li>
                  <li>Receive data in machine-readable format (JSON)</li>
                  <li>How to exercise: Email legal@useplunk.com or use API to access your data</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  8.2 Right to Rectification (Art. 16)
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Correct inaccurate or incomplete data</li>
                  <li>How to exercise: Update account settings in dashboard or contact legal@useplunk.com</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  8.3 Right to Erasure ("Right to be Forgotten") (Art. 17)
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Delete your account and all associated data</li>
                  <li>Immediate and permanent deletion (no grace period)</li>
                  <li>How to exercise: Dashboard &gt; Settings &gt; Delete Account, or email legal@useplunk.com</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  8.4 Right to Data Portability (Art. 20)
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Export your data in JSON format</li>
                  <li>Transfer data to another service</li>
                  <li>How to exercise: Use API endpoints to access your data, or request via legal@useplunk.com</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">8.5 Right to Object (Art. 21)</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Object to processing based on legitimate interests</li>
                  <li>Object to marketing emails</li>
                  <li>How to exercise: Email legal@useplunk.com</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  8.6 Right to Restrict Processing (Art. 18)
                </h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Temporarily limit how we process your data</li>
                  <li>How to exercise: Email legal@useplunk.com</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">8.7 Right to Lodge a Complaint</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>File a complaint with your data protection authority</li>
                  <li>
                    EU/EEA supervisory authorities:{' '}
                    <a
                      href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                    >
                      edpb.europa.eu
                    </a>
                  </li>
                </ul>

                <div className="my-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
                  <h4 className="mb-3 text-lg font-semibold text-neutral-900">How to Exercise Your Rights</h4>
                  <ol className="ml-6 list-decimal space-y-2 text-neutral-700">
                    <li>Email: legal@useplunk.com</li>
                    <li>Subject: "GDPR Request - [Your Right]"</li>
                    <li>Include: Your account email and specific request</li>
                    <li>Response time: Within 30 days (GDPR requirement)</li>
                  </ol>
                  <p className="mt-4 text-ui text-neutral-600">No fees for exercising your rights.</p>
                </div>
              </section>

              {/* Section 9 */}
              <section id="email-tracking" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">9. Email Tracking</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">9.1 Tracking Modes</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Plunk offers three tracking modes (configurable per project):
                </p>

                <div className="mb-4 space-y-4">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-2 font-semibold text-neutral-900">ENABLED (Default):</p>
                    <ul className="ml-6 list-disc space-y-1 text-ui text-neutral-700">
                      <li>Tracks all emails (transactional, campaigns, workflows)</li>
                      <li>Open tracking via 1x1 pixel image</li>
                      <li>Click tracking via redirect links</li>
                      <li>Used for: Analytics, workflow triggers, performance monitoring</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-2 font-semibold text-neutral-900">DISABLED:</p>
                    <ul className="ml-6 list-disc space-y-1 text-ui text-neutral-700">
                      <li>No tracking for any emails</li>
                      <li>No pixels or redirect links</li>
                      <li>Emails sent via AWS SES no-tracking configuration set</li>
                      <li>Used for: Privacy-focused deployments</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                    <p className="mb-2 font-semibold text-neutral-900">MARKETING ONLY:</p>
                    <ul className="ml-6 list-disc space-y-1 text-ui text-neutral-700">
                      <li>Tracks only campaigns and workflows</li>
                      <li>Transactional emails not tracked</li>
                      <li>Balance between privacy and analytics</li>
                    </ul>
                  </div>
                </div>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">9.2 How Tracking Works</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Open Tracking:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Transparent 1x1 pixel image embedded in email HTML</li>
                  <li>Loaded when recipient opens email (if images enabled)</li>
                  <li>Records: First open timestamp, total open count</li>
                  <li>Limitation: May not work if images are blocked</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Click Tracking:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Links rewritten to pass through Plunk redirect server</li>
                  <li>Records: First click timestamp, total click count, link URL</li>
                  <li>Then immediately redirects to original destination</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Data Collected:</strong>
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Timestamp of event</li>
                  <li>Contact ID and email ID</li>
                  <li>No tracking of IP address or user-agent from recipients</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">9.3 Recipient Privacy</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">Recipients can avoid tracking by:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Disabling images in their email client (blocks open tracking)</li>
                  <li>Using email clients that block tracking pixels (Apple Mail Privacy Protection)</li>
                  <li>Not clicking links (avoids click tracking)</li>
                </ul>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  <strong className="font-semibold text-neutral-900">Important:</strong> You should disclose tracking in
                  your privacy policy to your contacts.
                </p>
              </section>

              {/* Section 10 */}
              <section id="cookies" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">10. Cookies & Local Storage</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">10.1 Cookies</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We use only ONE cookie:</p>

                <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
                  <p className="mb-3 text-lg font-semibold text-neutral-900">Cookie Name: next_token</p>
                  <ul className="ml-6 list-disc space-y-2 text-neutral-700">
                    <li>
                      <strong className="font-semibold text-neutral-900">Purpose:</strong> Authentication (stores JWT
                      token)
                    </li>
                    <li>
                      <strong className="font-semibold text-neutral-900">Type:</strong> First-party, httpOnly, secure
                    </li>
                    <li>
                      <strong className="font-semibold text-neutral-900">Duration:</strong> 7 days
                    </li>
                    <li>
                      <strong className="font-semibold text-neutral-900">Domain:</strong> API host only
                    </li>
                    <li>
                      <strong className="font-semibold text-neutral-900">Data stored:</strong> Encrypted JWT with user
                      ID only
                    </li>
                    <li>
                      <strong className="font-semibold text-neutral-900">Can be deleted:</strong> Yes (logout clears
                      cookie)
                    </li>
                  </ul>

                  <p className="mb-2 mt-4 font-semibold text-neutral-900">Security Features:</p>
                  <ul className="ml-6 list-disc space-y-1 text-ui text-neutral-700">
                    <li>httpOnly: Not accessible via JavaScript (XSS protection)</li>
                    <li>secure: HTTPS-only (no transmission over HTTP)</li>
                    <li>SameSite: 'none' (for cross-subdomain access)</li>
                  </ul>
                </div>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">NO TRACKING COOKIES</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>No Google Analytics cookies</li>
                  <li>No Facebook Pixel cookies</li>
                  <li>No advertising or marketing cookies</li>
                  <li>No third-party cookies</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">10.2 Browser Local Storage</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">We store non-sensitive UI preferences locally:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Theme preference (light/dark mode)</li>
                  <li>Sidebar collapsed/expanded state</li>
                  <li>Table column visibility</li>
                  <li>Dashboard layout preferences</li>
                </ul>

                <p className="mb-4 leading-relaxed text-neutral-700">This data:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Never leaves your browser</li>
                  <li>Not sent to our servers</li>
                  <li>Deleted when you clear browser data</li>
                  <li>Not used for tracking</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">10.3 Cookie Consent</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Since we only use essential authentication cookies (not tracking), EU cookie consent is not required
                  under ePrivacy Directive.
                </p>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  If you disagree, you cannot use Plunk (authentication requires cookies).
                </p>
              </section>

              {/* Section 11 */}
              <section id="international" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">11. International Data Transfers</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">11.1 Primary Storage (EU/EEA)</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">All primary data storage is in the EU/EEA:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Hetzner data centers (Germany)</li>
                  <li>PostgreSQL database (EU/EEA)</li>
                  <li>Redis cache (EU/EEA)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">11.2 Email Transit (AWS SES - USA)</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Email delivery via AWS SES requires temporary data transfer to USA:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Email delivery may transit through non-EU regions</li>
                  <li>Data in transit only (not stored long-term outside EU/EEA)</li>
                  <li>Protected by Data Processing Agreements (DPA) and Standard Contractual Clauses (SCCs)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">
                  11.3 Payment Processing (Stripe - Global)
                </h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Stripe processes payments globally with adequate protection:
                </p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>PCI-DSS Level 1 certified</li>
                  <li>Stripe DPA and GDPR compliance</li>
                  <li>EU representative: Stripe Payments Europe, Ltd. (Ireland)</li>
                </ul>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Learn more:{' '}
                  <a
                    href="https://stripe.com/privacy-center/legal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                  >
                    stripe.com/privacy-center/legal
                  </a>
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">11.4 Adequacy Decisions</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Where possible, we rely on EU adequacy decisions for data transfers. For USA transfers, we use
                  Standard Contractual Clauses (SCCs) as approved by the European Commission.
                </p>
              </section>

              {/* Section 12 */}
              <section id="children" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">12. Children's Privacy</h2>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Age Restriction</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Plunk is not intended for children under 16 years old</li>
                  <li>We do not knowingly collect data from children under 16</li>
                  <li>Account registration requires attestation of age 16+</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">If We Discover</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>That a user is under 16, we will immediately delete the account</li>
                  <li>No refunds for deleted underage accounts</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Parental Rights</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>If you believe your child has created an account, contact legal@useplunk.com</li>
                  <li>We will promptly investigate and delete the account</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">GDPR Age of Consent</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  16 years (per Art. 8 GDPR). Member states may lower to 13, but we use 16 as the standard.
                </p>
              </section>

              {/* Section 13 */}
              <section id="self-hosted" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">13. Self-Hosted Deployments</h2>
                <div className="mb-6 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-6">
                  <p className="font-semibold text-yellow-900">
                    This Privacy Policy applies ONLY to the hosted service at useplunk.com.
                  </p>
                </div>

                <p className="mb-4 leading-relaxed text-neutral-700">If you self-host Plunk:</p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">You are the Data Controller</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>You determine how data is collected, used, and stored</li>
                  <li>You are responsible for GDPR compliance</li>
                  <li>You must create your own Privacy Policy for your users</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Your Responsibilities</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Obtain consent from your contacts</li>
                  <li>Honor GDPR data subject rights (access, deletion, etc.)</li>
                  <li>Implement security measures</li>
                  <li>Notify users of data breaches</li>
                  <li>Appoint a DPO if required</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Plunk's Role</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>We provide open-source software under AGPL v3 License</li>
                  <li>No data is sent to Plunk (unless you configure external services)</li>
                  <li>No support for GDPR compliance (community support only)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Recommended</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Review GDPR requirements for your jurisdiction</li>
                  <li>Consult legal counsel for compliance</li>
                  <li>Implement data protection by design</li>
                </ul>
              </section>

              {/* Section 14 */}
              <section id="policy-changes" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">14. Changes to Privacy Policy</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">We may update this Privacy Policy to reflect:</p>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Changes in data processing practices</li>
                  <li>New features or services</li>
                  <li>Legal or regulatory requirements</li>
                  <li>Clarifications or corrections</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Notification</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Material changes: 30-day email notice to all users</li>
                  <li>Non-material changes: Updated "Last Updated" date only</li>
                  <li>Major changes: Homepage banner notification</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Your Options</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>Continued use = acceptance of updated policy</li>
                  <li>If you disagree, you must delete your account before changes take effect</li>
                  <li>Request access to your data before deletion (GDPR right to portability)</li>
                </ul>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Version History</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Previous versions available upon request (email legal@useplunk.com)
                </p>
              </section>

              {/* Section 15 */}
              <section id="contact" className="mb-12">
                <h2 className="mb-4 text-2xl font-bold text-neutral-900">15. Contact Information</h2>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Questions about this Privacy Policy or your data?
                </p>

                <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
                  <p className="mb-2 font-semibold text-neutral-900">Privacy Inquiries & GDPR Requests:</p>
                  <p className="mb-1 text-neutral-700">
                    Email:{' '}
                    <a href="mailto:legal@useplunk.com" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                      legal@useplunk.com
                    </a>
                  </p>
                  <p className="mb-1 text-ui text-neutral-600">Subject: "Privacy Inquiry" or "GDPR Request"</p>
                  <p className="text-ui text-neutral-600">
                    Response time: Within 7 business days (30 days for GDPR requests)
                  </p>
                </div>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Data Protection Officer (DPO)</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  Not required for personal projects under GDPR Art. 37. If appointed in the future, contact information
                  will be listed here.
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">EU Representative</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">Not required (Plunk is EU-based)</p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Supervisory Authority</h3>
                <p className="mb-4 leading-relaxed text-neutral-700">
                  You have the right to lodge a complaint with your data protection authority. Find your authority:{' '}
                  <a
                    href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                  >
                    edpb.europa.eu
                  </a>
                </p>

                <h3 className="mb-3 mt-6 text-xl font-semibold text-neutral-900">Technical Support</h3>
                <ul className="mb-4 ml-6 list-disc space-y-2 text-neutral-700">
                  <li>
                    GitHub Discussions:{' '}
                    <a
                      href="https://github.com/useplunk/plunk/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900"
                    >
                      github.com/useplunk/plunk/discussions
                    </a>
                  </li>
                  <li>
                    Discord:{' '}
                    <Link href="/discord" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                      useplunk.com/discord
                    </Link>
                  </li>
                </ul>
              </section>
            </div>

            {/* Footer CTA */}
            <div className="mt-16 rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center">
              <p className="mb-2 text-lg font-semibold text-neutral-900">Questions about your privacy?</p>
              <p className="mb-4 text-neutral-700">
                We're committed to protecting your data. Contact us at{' '}
                <a href="mailto:legal@useplunk.com" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                  legal@useplunk.com
                </a>
              </p>
              <p className="text-ui text-neutral-600">
                For service terms, please review our{' '}
                <Link href="/terms" className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition hover:decoration-neutral-900">
                  Terms of Service
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
