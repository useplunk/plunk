import {FeatureCTA, Footer, MoreTools, Navbar, ToolExplainer, ToolHero, ToolPanel} from '../../components';
import {motion} from 'framer-motion';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import type {EmailVerificationResult as VerificationResult} from '@plunk/types';
import {verifyEmail} from '../../lib/emailVerification';
import {EmailVerificationResult} from '../../components/tools/EmailVerificationResult';
import {Button, Input} from '@plunk/ui';

const explainer = [
  {
    title: 'Improve deliverability',
    body: 'Remove invalid emails before sending to reduce bounce rates and improve email deliverability.',
  },
  {
    title: 'Catch typos',
    body: 'Detect common typos like "gmial.com" and suggest corrections to capture valid addresses.',
  },
  {
    title: 'Protect reputation',
    body: 'High bounce rates hurt your sender reputation. Verify emails to maintain a good standing.',
  },
  {
    title: 'DNS validation',
    body: 'Check if the email domain exists and has properly configured MX records for receiving mail.',
  },
  {
    title: 'Disposable detection',
    body: 'Identify temporary email addresses that are often used for spam or fake signups.',
  },
  {
    title: 'Personal email detection',
    body: 'Detect personal/free email providers like Gmail, Hotmail, Yahoo for B2B validation.',
  },
  {
    title: 'Plus addressing',
    body: 'Detect plus-addressed emails (user+tag@domain.com) which can be useful for tracking.',
  },
];

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const verificationResult = await verifyEmail(email);
      setResult(verificationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NextSeo
        title="Email Validator | Free Email Address Verification Tool | Plunk"
        description="Free email validator tool. Check email addresses for validity, typos, disposable domains, and MX record configuration. Verify any email instantly."
        canonical="https://www.useplunk.com/tools/verify-email"
        openGraph={{
          title: 'Email Validator | Free Email Address Verification Tool | Plunk',
          description: 'Free email validator. Check email addresses for validity, typos, disposable domains, and MX records. Verify any email instantly.',
          url: 'https://www.useplunk.com/tools/verify-email',
          images: [{url: 'https://www.useplunk.com/api/og?title=Free+Email+Address+Validator&tag=Tool', alt: 'Plunk Email Validator Tool', width: 1200, height: 630}],
        }}
      />

      <Navbar />

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'Email address verification'}
            subtitle={
              'Check any address for typos, disposable domains and missing MX records before it costs you a bounce.'
            }
          >
            <ToolPanel>
              <form onSubmit={handleVerify} className={'flex flex-col gap-3 sm:flex-row'}>
                <label htmlFor="email" className={'sr-only'}>
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  disabled={loading}
                  className={'h-11 flex-1'}
                />
                <Button type="submit" disabled={loading || !email} className={'h-11 px-6'}>
                  {loading ? 'Verifying…' : 'Verify email'}
                </Button>
              </form>
              {error && <p className={'mt-3 text-ui text-err'}>{error}</p>}
            </ToolPanel>

            {result && (
              <motion.div
                initial={{opacity: 0, y: 12}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
                className={'mt-6'}
              >
                <EmailVerificationResult result={result} />
              </motion.div>
            )}
          </ToolHero>

          <ToolExplainer
            title={'Protect your sender reputation'}
            subtitle={'Invalid addresses hurt deliverability. Verification keeps your list clean before you send.'}
            items={explainer}
          />

          <MoreTools current={'verify-email'} />

          <FeatureCTA
            title={'Ready for production-grade verification?'}
            body={
              'Bulk verification, real-time validation, and seamless integration with your email workflows. Start free, no credit card required.'
            }
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
