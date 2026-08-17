import React from 'react';
import {GuideLayout, InfoBox} from '../../components/guides';
import {CodeBlock} from '../../components/CodeBlock';
import Link from 'next/link';
import type {FAQ} from '../../components/FAQSection';

const faqs: FAQ[] = [
  {
    question: 'What is DKIM?',
    answer:
      'DKIM (DomainKeys Identified Mail) is an email authentication method that adds a cryptographic digital signature to your outgoing emails. It allows receiving mail servers to verify that an email was genuinely sent from your domain and that its content was not altered in transit, improving deliverability and protecting against email spoofing.',
  },
  {
    question: 'What is a DKIM key?',
    answer:
      'A DKIM key is a cryptographic key pair used to sign and verify emails. The private key is stored securely on your mail server and used to sign outgoing emails. The public key is published as a TXT record in your domain\'s DNS under selector._domainkey.yourdomain.com and is used by receiving servers to verify the signature. You should never share or expose your DKIM private key.',
  },
  {
    question: 'How do I set up DKIM?',
    answer:
      'Setting up DKIM involves three steps: (1) Generate a DKIM key pair for your domain—most email providers do this automatically, (2) Publish the public key as a TXT record in your DNS at selector._domainkey.yourdomain.com, and (3) Configure your mail server or email service provider to sign outgoing emails with the private key. Platforms like Plunk handle all of this automatically when you add your domain.',
  },
  {
    question: 'What is the difference between DKIM and SPF?',
    answer:
      'SPF (Sender Policy Framework) verifies that the sending mail server is authorized to send email for your domain by checking its IP address against your DNS record. DKIM adds a cryptographic signature to the email that verifies the content has not been altered in transit. They are complementary: SPF validates the server identity, DKIM validates the message integrity. Using both together—along with DMARC—provides the strongest email authentication.',
  },
  {
    question: 'What happens if DKIM fails?',
    answer:
      'If DKIM verification fails, the receiving mail server may treat the email as suspicious. Depending on your DMARC policy, failed DKIM emails might be delivered normally (p=none), sent to spam (p=quarantine), or completely rejected (p=reject). Persistent DKIM failures damage your sender reputation and reduce email deliverability. Common causes include misconfigured DNS records, expired keys, or email modification during forwarding.',
  },
];

export default function WhatIsDKIM() {
  return (
    <GuideLayout
      title="What is DKIM? Email Authentication Explained"
      description="Learn how DKIM (DomainKeys Identified Mail) works, what a DKIM key is, and how to set it up to protect your emails from spoofing and improve deliverability."
      lastUpdated="2025-12-20"
      readTime="10 min"
      canonical="https://www.useplunk.com/guides/what-is-dkim"
      faqs={faqs}
    >
      {/* Introduction */}
      <section id="introduction" className="mb-12">
        <p className="text-neutral-700 leading-relaxed">
          DKIM (DomainKeys Identified Mail) is an email authentication method that allows receiving mail servers to
          verify that an email was actually sent by the domain it claims to be from and that the message wasn't altered
          in transit.
        </p>
        <p className="mt-4 text-neutral-700 leading-relaxed">
          Think of DKIM as a digital signature for your emails—like a wax seal on a letter that proves it's authentic
          and hasn't been tampered with.
        </p>
      </section>

      {/* How DKIM Works */}
      <section id="how-dkim-works" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How DKIM Works</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          DKIM uses cryptographic authentication to validate emails. Here's the process:
        </p>

        <div className="space-y-6 mb-8">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">1. The Sending Server Signs the Email</h3>
            <p className="text-neutral-700">
              When you send an email, your email server adds a DKIM signature to the email header. This signature is
              created using a private key that only your server knows.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">2. The Signature is Added to Headers</h3>
            <p className="text-neutral-700">
              The DKIM signature includes a hash of specific email components (like the subject, body, and sender) and
              is added to the email headers as a "DKIM-Signature" field.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">3. The Receiving Server Verifies</h3>
            <p className="text-neutral-700">
              When the email arrives, the receiving server looks up your domain's public DKIM key in DNS, then uses it
              to verify the signature. If everything matches, the email passes DKIM authentication.
            </p>
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">4. Delivery Decision</h3>
            <p className="text-neutral-700">
              Passing DKIM verification improves your sender reputation and deliverability. Failing or missing DKIM may
              result in emails being flagged as suspicious or sent to spam.
            </p>
          </div>
        </div>

        <InfoBox type="tip" title="Technical Detail">
          <p>
            DKIM uses asymmetric cryptography (public/private key pairs). The private key stays secure on your mail
            server, while the public key is published in your DNS records for anyone to verify.
          </p>
        </InfoBox>
      </section>

      {/* DKIM Record Example */}
      <section id="dkim-record-example" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What Does a DKIM Record Look Like?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          A DKIM record is a TXT record in your DNS that contains your public key. Here's an example:
        </p>

        <div className="w-full max-w-full overflow-x-auto">
          <CodeBlock
            language="dns"
            title="Example DKIM DNS Record"
            code={`default._domainkey.yourdomain.com  IN  TXT  "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC3QEKyU1fSma0axspqYK5iAj+54lsAg4qRRCnpKK68hawSJfliq9vKD6czJ..."

# Breaking down the components:
# v=DKIM1          -> DKIM version
# k=rsa            -> Key type (RSA encryption)
# p=MIGfMA0...     -> Public key (base64 encoded)`}
          />
        </div>

        <InfoBox type="info" title="Selector Names">
          <p>
            The "default" in <code>default._domainkey</code> is called a selector. You can use different selectors to
            rotate keys or separate different email streams (e.g., marketing, transactional).
          </p>
        </InfoBox>
      </section>

      {/* Why DKIM Matters */}
      <section id="why-dkim-matters" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Why DKIM Matters for Email Deliverability</h2>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Prevents Email Spoofing</h3>
              <p className="text-neutral-700">
                DKIM makes it nearly impossible for spammers to forge emails from your domain. The cryptographic
                signature can't be replicated without your private key.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Improves Deliverability</h3>
              <p className="text-neutral-700">
                Major email providers (Gmail, Outlook, Yahoo) use DKIM as a trust signal. Emails with valid DKIM
                signatures are more likely to reach the inbox.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Protects Brand Reputation</h3>
              <p className="text-neutral-700">
                By preventing domain spoofing, DKIM protects your brand from being used in phishing attacks that could
                damage your reputation.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="w-full max-w-full wrap-break-word">
              <h3 className="text-lg font-semibold text-neutral-900 mb-3">Enables DMARC</h3>
              <p className="text-neutral-700">
                DKIM is a prerequisite for implementing DMARC, which provides even stronger email authentication and
                reporting capabilities.
              </p>
            </div>
          </div>
        </div>

        <InfoBox type="warning" title="Gmail & Yahoo Requirements">
          <p>
            As of February 2024, Gmail and Yahoo require DKIM authentication for bulk senders (5,000+ emails/day). Even
            if you send less, implementing DKIM is considered a best practice.
          </p>
        </InfoBox>
      </section>

      {/* DKIM Signature Example */}
      <section id="dkim-signature-example" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">What Does a DKIM Signature Look Like?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          When you send an email, the DKIM signature is added to the email headers. Here's what it looks like:
        </p>

        <CodeBlock
          language="text"
          title="DKIM-Signature Header Example"
          code={`DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
  d=yourdomain.com; s=default;
  h=from:subject:date:message-id:to;
  bh=frcCV1k9oG9oKj3dpUqdJg1PxRT2RSN/XKdLCPjaYaY=;
  b=GJwP3Qr8KqKKKNT5HL8j3fjXvLEm9KmZs6YdO2KqEqr...

# Key components:
# v=1                -> DKIM version
# d=yourdomain.com   -> Signing domain
# s=default          -> Selector (matches DNS record)
# h=from:subject...  -> Headers included in signature
# bh=frcCV1...       -> Hash of email body
# b=GJwP3Q...        -> The actual signature`}
        />
      </section>

      {/* How Plunk Handles DKIM */}
      <section id="plunk-dkim" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How Plunk Simplifies DKIM</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          Setting up DKIM manually can be complex, but Plunk makes it automatic:
        </p>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              1
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Automatic Key Generation</h3>
              <p className="text-neutral-700">
                Plunk automatically generates secure DKIM key pairs for your domain when you add it to your account.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              2
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Simple DNS Setup</h3>
              <p className="text-neutral-700">
                We provide the exact DNS records you need to add—just copy and paste into your DNS provider.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              3
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Automatic Signing</h3>
              <p className="text-neutral-700">
                Every email you send through Plunk is automatically signed with DKIM. No configuration needed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-xl bg-neutral-50 border border-neutral-200">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white text-ui font-bold">
              4
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Verification & Monitoring</h3>
              <p className="text-neutral-700">
                Plunk verifies your DKIM setup and monitors authentication status for all your emails.
              </p>
            </div>
          </div>
        </div>

        <InfoBox type="success" title="Ready in Minutes">
          <p>
            Most Plunk users have DKIM fully configured and working within 5-10 minutes. Our dashboard guides you
            through every step.
          </p>
        </InfoBox>
      </section>

      {/* DKIM Best Practices */}
      <section id="dkim-best-practices" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">DKIM Best Practices</h2>

        <div className="space-y-6">
          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✓ Use 2048-bit Keys</h3>
            <p className="text-neutral-700">
              While 1024-bit keys still work, 2048-bit keys provide better security and are recommended by Gmail and
              other providers.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✓ Implement SPF and DMARC Too</h3>
            <p className="text-neutral-700">
              DKIM works best when combined with SPF and DMARC for comprehensive email authentication. Use all three for
              maximum protection.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✓ Monitor DKIM Status</h3>
            <p className="text-neutral-700">
              Regularly check that your DKIM signatures are passing. Most email platforms provide authentication
              reports.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✓ Rotate Keys Periodically</h3>
            <p className="text-neutral-700">
              For enhanced security, rotate your DKIM keys every 6-12 months. Plan key rotation carefully to avoid
              delivery disruptions.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Don't Share Private Keys</h3>
            <p className="text-neutral-700">
              Your DKIM private key should never be shared or stored insecurely. Treat it like a password.
            </p>
          </div>

          <div className="py-2">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">✗ Don't Use the Same Key Across Domains</h3>
            <p className="text-neutral-700">
              Each domain should have its own unique DKIM key pair for security and proper authentication.
            </p>
          </div>
        </div>
      </section>

      {/* DKIM vs SPF */}
      <section id="dkim-vs-spf" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">DKIM vs SPF: What's the Difference?</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          DKIM and SPF are both email authentication protocols, but they work differently and check different things:
        </p>

        <div className="rounded-xl border border-neutral-200 overflow-hidden mb-8">
          <table className="w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-4 text-left text-ui font-semibold text-neutral-900">Feature</th>
                <th className="px-6 py-4 text-left text-ui font-semibold text-neutral-900">DKIM</th>
                <th className="px-6 py-4 text-left text-ui font-semibold text-neutral-900">SPF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              <tr>
                <td className="px-6 py-4 text-ui font-medium text-neutral-900">What it validates</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Email content integrity</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Sending server authorization</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-medium text-neutral-900">How it works</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Cryptographic signature in headers</td>
                <td className="px-6 py-4 text-ui text-neutral-700">IP address check against DNS list</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-medium text-neutral-900">Survives forwarding</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Yes (if content unchanged)</td>
                <td className="px-6 py-4 text-ui text-neutral-700">No (forwarded IP changes)</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-medium text-neutral-900">DNS record type</td>
                <td className="px-6 py-4 text-ui text-neutral-700">TXT at selector._domainkey.*</td>
                <td className="px-6 py-4 text-ui text-neutral-700">TXT at root domain</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-ui font-medium text-neutral-900">Required for DMARC</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Yes (one of SPF/DKIM required)</td>
                <td className="px-6 py-4 text-ui text-neutral-700">Yes (one of SPF/DKIM required)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <InfoBox type="tip" title="Use Both for Maximum Protection">
          <p>
            DKIM and SPF complement each other. SPF covers scenarios where DKIM can't (like forged server IPs), and DKIM
            covers forwarding scenarios where SPF breaks. Implementing both—plus DMARC—gives you complete email
            authentication coverage.
          </p>
        </InfoBox>
      </section>

      {/* How to Test DKIM */}
      <section id="test-dkim" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">How to Test Your DKIM Setup</h2>
        <p className="text-neutral-700 leading-relaxed mb-6">
          After setting up DKIM, verify it's working correctly using these methods:
        </p>

        <div className="space-y-6">
          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">1. Check the Email Headers</h3>
            <p className="text-neutral-700 mb-4">
              Send a test email and view the raw message headers. Look for the <code>DKIM-Signature</code> header and the{' '}
              <code>Authentication-Results</code> header which shows whether DKIM passed or failed:
            </p>
            <CodeBlock
              language="text"
              title="Example Authentication-Results Header"
              code={`Authentication-Results: mx.google.com;
  dkim=pass header.i=@yourdomain.com header.s=default header.b=GJwP3Qr8;
  spf=pass (google.com: domain of you@yourdomain.com designates 1.2.3.4 as permitted sender);
  dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=yourdomain.com`}
            />
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">2. Use DNS Lookup Tools</h3>
            <p className="text-neutral-700">
              Verify your DKIM public key is correctly published in DNS by querying your DKIM TXT record:
            </p>
            <CodeBlock
              language="bash"
              title="DNS Lookup Command"
              code={`# Check your DKIM record via DNS
dig TXT default._domainkey.yourdomain.com

# Or using nslookup
nslookup -type=TXT default._domainkey.yourdomain.com`}
            />
          </div>

          <div className="">
            <h3 className="text-xl font-semibold text-neutral-900 mb-3">3. Send to Gmail and Check</h3>
            <p className="text-neutral-700">
              Send a test email to a Gmail address, then click the three-dot menu and select "Show original". The
              "Summary" at the top will show DKIM: PASS or DKIM: FAIL, confirming your setup is working.
            </p>
          </div>
        </div>

        <InfoBox type="info" title="Common DKIM Issues">
          <p>
            If DKIM fails, check that: (1) The DNS record uses the correct selector name, (2) The record hasn't been
            truncated by your DNS provider (long keys may need to be split), (3) DNS propagation is complete (can take
            up to 48 hours), and (4) Your email service is configured to sign with the correct private key.
          </p>
        </InfoBox>
      </section>

      {/* Related Guides */}
      <section id="related-guides" className="mb-12">
        <h2 className="text-3xl font-bold text-neutral-900 mb-6">Related Email Authentication Guides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/guides/what-is-spf"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is SPF?</h3>
            <p className="text-ui text-neutral-600">Learn about SPF records and how they complement DKIM.</p>
          </Link>
          <Link
            href="/guides/what-is-dmarc"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">What is DMARC?</h3>
            <p className="text-ui text-neutral-600">Complete guide to DMARC policies and email security.</p>
          </Link>
          <Link
            href="/guides/email-deliverability"
            className="block rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-300 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">Email Deliverability Guide</h3>
            <p className="text-ui text-neutral-600">Improve your email deliverability with best practices.</p>
          </Link>
        </div>
      </section>
    </GuideLayout>
  );
}
