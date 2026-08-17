import {Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {ArrowRight, CheckCircle, Loader2, Search} from 'lucide-react';
import type {EmailVerificationResult as VerificationResult} from '@plunk/types';
import {verifyEmail} from '../../lib/emailVerification';
import {EmailVerificationResult} from '../../components/tools/EmailVerificationResult';
import {Button, Input} from '@plunk/ui';
import {EMAIL_VERIFICATION_FEATURES} from '../../lib/toolsContent';
import {Funnel_Display, Funnel_Sans, JetBrains_Mono} from 'next/font/google';
import Link from 'next/link';

const display = Funnel_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const body = Funnel_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

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

      <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <main className={'text-neutral-800'}>
          {/* ========== HERO ========== */}
          <section className={'relative overflow-hidden'}>
            <div
              aria-hidden
              className={
                'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
              }
            />

            <div className={'mx-auto max-w-[88rem] px-6 pb-24 pt-20 sm:px-10 sm:pt-28 lg:pb-36'}>
              <motion.div
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                style={{fontFamily: 'var(--font-mono)'}}
                className={
                  'mb-16 flex items-center justify-between border-t border-neutral-900/90 pt-4 text-label text-neutral-700 sm:mb-24'
                }
              >
                <span className={'font-medium text-neutral-900'}>§ T-02 &nbsp;— &nbsp;Tool</span>
                <Link href="/tools" className={'text-neutral-500 transition hover:text-neutral-900'}>
                  ← All tools
                </Link>
              </motion.div>

              <motion.div
                initial={{opacity: 0, y: 16}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                className={'mx-auto max-w-5xl text-center'}
              >
                <h1
                  style={{fontFamily: 'var(--font-display)'}}
                  className={
                    'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'
                  }
                >
                  Email address
                  <br />
                  verification
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Check for typos, disposable domains, DNS configuration, and MX records. Detailed results in seconds.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ========== VERIFICATION TOOL ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mx-auto max-w-2xl'}
            >
              <div className={'overflow-hidden rounded-card border border-neutral-200 bg-white'}>
                <div className={'border-b border-neutral-200 px-8 py-5'}>
                  <div className={'flex items-center gap-3'}>
                    <Search className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      Verify an address
                    </span>
                  </div>
                </div>

                <form onSubmit={handleVerify} className={'space-y-4 p-8'}>
                  <div>
                    <label htmlFor="email" className={'mb-2 block text-ui font-medium text-neutral-900'}>
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
                      className={'w-full'}
                    />
                  </div>

                  <Button type="submit" disabled={loading || !email} className={'w-full gap-2'}>
                    {loading ? (
                      <>
                        <Loader2 className={'h-4 w-4 animate-spin'} />
                        Verifying…
                      </>
                    ) : (
                      <>
                        <CheckCircle className={'h-4 w-4'} />
                        Verify email
                      </>
                    )}
                  </Button>
                </form>

                {error && (
                  <div className={'mx-8 mb-8 rounded-lg border border-err/25 bg-err-surface p-4'}>
                    <p className={'text-ui text-err'}>{error}</p>
                  </div>
                )}
              </div>

              {result && (
                <motion.div
                  initial={{opacity: 0, y: 16}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                  className={'mt-6'}
                >
                  <EmailVerificationResult result={result} />
                </motion.div>
              )}
            </motion.div>
          </section>

          {/* ========== WHY VERIFY ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'Protect your'}
                titleAccent={'sender reputation.'}
                subtitle={'Invalid addresses hurt deliverability. Verification keeps your list clean before you send.'}
              />

              <div className={'mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
                {EMAIL_VERIFICATION_FEATURES.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      initial={{opacity: 0, y: 16}}
                      whileInView={{opacity: 1, y: 0}}
                      viewport={{once: true}}
                      transition={{duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1]}}
                      className={
                        'flex flex-col gap-8 rounded-card border border-neutral-200 bg-white p-8 transition hover:border-neutral-900'
                      }
                    >
                      <div className={'text-neutral-900'}>
                        <Icon className={'h-6 w-6'} strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3
                          style={{fontFamily: 'var(--font-display)'}}
                          className={'text-h3 font-bold tracking-[-0.02em] text-neutral-900'}
                        >
                          {feature.title}
                        </h3>
                        <p className={'mt-2 text-ui leading-relaxed text-neutral-600'}>{feature.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ========== CTA ========== */}
          <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-32 sm:px-10 sm:py-40'}>
              <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
                <motion.h2
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                  style={{fontFamily: 'var(--font-display)'}}
                  className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}
                >
                  Ready for production-grade verification?
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Bulk verification, real-time validation, and seamless integration with your email workflows. Start free, no credit card required.
                  </p>
                  <div className={'flex flex-wrap gap-3'}>
                    <motion.a
                      whileHover={{scale: 1.015}}
                      whileTap={{scale: 0.985}}
                      href={`${DASHBOARD_URI}/auth/signup`}
                      className={
                        'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'
                      }
                    >
                      Start with Plunk
                      <ArrowRight className={'h-4 w-4'} />
                    </motion.a>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
