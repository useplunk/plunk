import {FAQSection, Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {AlertTriangle, ArrowRight, CheckCircle, ShieldAlert, XCircle} from 'lucide-react';
import {Button, Input} from '@plunk/ui';
import {Funnel_Display, Funnel_Sans, JetBrains_Mono} from 'next/font/google';
import Link from 'next/link';
import type {FAQ} from '../../components/FAQSection';

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

const SPAM_TRIGGER_WORDS = [
  'act now', 'act immediately', 'action required', 'apply now', 'apply online',
  'as seen on', 'avoid bankruptcy', 'be your own boss', 'being a member',
  'big bucks', 'bill 1618', 'billion dollars', 'bonus',
  'buy direct', 'buy now', 'buyer protection', 'buying judgments',
  'call free', 'call now', 'cancel at any time', 'can\'t live without',
  'cash bonus', 'cash prize', 'celebrate', 'cent on the dollar',
  'chance', 'cheap', 'check now', 'claim now', 'claim your', 'click below',
  'click here', 'click now', 'click to remove', 'compare rates',
  'compete for your business', 'congratulations', 'consolidate debt',
  'copy accurately', 'copy dvds', 'deal', 'dear friend',
  'earn per week', 'earn extra cash', 'earn extra income',
  'eliminate bad credit', 'eliminate debt', 'excl', 'exclusive deal',
  'exclusive offer', 'extra cash', 'extra income',
  'f r e e', 'fantastic deal', 'fast cash', 'financial freedom',
  'find out anything', 'for free', 'for just $', 'for only $',
  'free access', 'free bonus', 'free cell phone', 'free consultation',
  'free gift', 'free grant money', 'free info', 'free installation',
  'free investment', 'free leads', 'free membership', 'free money',
  'free offer', 'free preview', 'free prize', 'free quote', 'free sample',
  'free trial', 'freedom', 'full refund', 'get it now', 'get out of debt',
  'get paid', 'give it away', 'giving it away', 'great offer',
  'guaranteed', 'hidden assets', 'hidden charges',
  'home based business', 'hot deal', 'huge discount', 'incredible deal',
  'incredible offer', 'information you requested', 'instant access',
  'instant approval', 'insurance', 'it\'s effective', 'join millions',
  'joining for free', 'junk mail', 'last chance', 'limited time',
  'lose weight', 'lowest price', 'lowest rate', 'lucky winner',
  'luxury car', 'luxury gift', 'make $', 'make money', 'make money fast',
  'marketing solutions', 'mass email', 'meet singles', 'member',
  'million dollars', 'miracle', 'money back', 'money making',
  'monthly payment', 'mortgage', 'multi level marketing',
  'name brand', 'new customer', 'new domain', 'now only',
  'obligation free', 'off everything', 'offer expires',
  'once in a lifetime', 'one hundred percent free', 'one hundred percent satisfied',
  'open an account', 'opportunity', 'opt in', 'order now',
  'order status', 'order today', 'outstanding values',
  'pennies a day', 'per day', 'per month', 'per week',
  'potential earnings', 'price protection', 'prices reduced',
  'prize', 'profit', 'promise you', 'pure profit',
  'refinance', 'refund', 'register for free', 'remove',
  'reverses aging', 'risk free', 'satisfaction guaranteed',
  'save big money', 'save up to', 'selected', 'serious cash',
  'sign up free', 'special discount', 'special offer', 'special promotion',
  'subject to credit', 'subscribe for free', 'super deal', 'supplies are limited',
  'take action', 'tens of thousands', 'the best rates',
  'time limited', 'trial offer', 'ultimate',
  'unbeatable', 'unbelievable', 'urgent', 'valued customer',
  'very cheap', 'want to make', 'while supplies last', 'winner',
  'work at home', 'work from home', 'you are a winner', 'you have been selected',
  'you have been chosen', 'you won', 'you\'ve won', 'your income',
];

interface SpamCheck {
  type: 'error' | 'warning' | 'pass';
  label: string;
  detail: string;
}

interface SpamResult {
  score: number;
  checks: SpamCheck[];
  triggeredWords: string[];
}

function analyzeSpam(subject: string, body: string): SpamResult {
  const checks: SpamCheck[] = [];
  const triggeredWords: string[] = [];
  let deductions = 0;

  const fullText = `${subject} ${body}`.toLowerCase();

  // Check for spam trigger words
  const foundWords = SPAM_TRIGGER_WORDS.filter(word => fullText.includes(word));
  if (foundWords.length === 0) {
    checks.push({type: 'pass', label: 'No spam trigger words', detail: 'Your content does not contain common spam trigger phrases.'});
  } else if (foundWords.length <= 2) {
    checks.push({type: 'warning', label: `${foundWords.length} spam trigger word${foundWords.length > 1 ? 's' : ''} found`, detail: `Found: ${foundWords.slice(0, 5).join(', ')}. Consider rephrasing these.`});
    deductions += foundWords.length * 8;
    triggeredWords.push(...foundWords.slice(0, 5));
  } else {
    checks.push({type: 'error', label: `${foundWords.length} spam trigger words found`, detail: `Found: ${foundWords.slice(0, 6).join(', ')}${foundWords.length > 6 ? ` and ${foundWords.length - 6} more` : ''}. Rewrite to use natural language.`});
    deductions += Math.min(foundWords.length * 8, 45);
    triggeredWords.push(...foundWords.slice(0, 6));
  }

  // Check subject line length
  if (subject.length === 0) {
    checks.push({type: 'error', label: 'Empty subject line', detail: 'A subject line is required. Missing subjects trigger spam filters.'});
    deductions += 20;
  } else if (subject.length < 10) {
    checks.push({type: 'warning', label: 'Subject line too short', detail: 'Very short subjects may appear suspicious. Aim for 30–50 characters.'});
    deductions += 5;
  } else if (subject.length > 70) {
    checks.push({type: 'warning', label: 'Subject line too long', detail: `${subject.length} characters. Subject lines over 70 characters are truncated and may reduce opens.`});
    deductions += 5;
  } else {
    checks.push({type: 'pass', label: 'Good subject line length', detail: `${subject.length} characters — within the recommended 30–70 character range.`});
  }

  // Check for excessive capitalization in subject
  const subjectWords = subject.split(' ').filter(w => w.length > 2);
  const capsWords = subjectWords.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length > 2) {
    checks.push({type: 'error', label: 'Excessive capitalization in subject', detail: `"${capsWords.join('", "')}" — all-caps words look like shouting and trigger spam filters.`});
    deductions += 15;
  } else if (capsWords.length > 0) {
    checks.push({type: 'warning', label: 'Capitalized words in subject', detail: `"${capsWords.join('", "')}" — use sentence case for a more professional appearance.`});
    deductions += 5;
  } else {
    checks.push({type: 'pass', label: 'No excessive capitalization', detail: 'Subject line uses normal capitalization.'});
  }

  // Check for excessive exclamation marks in subject
  const exclamationCount = (subject.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    checks.push({type: 'error', label: 'Multiple exclamation marks in subject', detail: `${exclamationCount} exclamation marks found. Multiple "!" are a strong spam signal.`});
    deductions += 10;
  } else if (exclamationCount === 1) {
    checks.push({type: 'warning', label: 'Exclamation mark in subject', detail: 'A single exclamation mark is borderline. Prefer natural punctuation.'});
    deductions += 3;
  } else {
    checks.push({type: 'pass', label: 'No excessive punctuation', detail: 'No exclamation marks in the subject line.'});
  }

  // Check for $ in subject
  if (subject.includes('$')) {
    checks.push({type: 'warning', label: 'Dollar sign in subject', detail: 'The $ symbol in subject lines is a common spam trigger. Spell out "dollars" or reframe the message.'});
    deductions += 8;
  }

  // Check for % in subject (common in discount spam)
  if (subject.includes('%')) {
    checks.push({type: 'warning', label: 'Percentage in subject', detail: 'Percentage symbols in subject lines are frequently associated with promotional spam.'});
    deductions += 5;
  }

  // Check body length
  if (body.length > 0 && body.length < 50) {
    checks.push({type: 'warning', label: 'Very short email body', detail: 'Very short bodies with mostly links raise spam flags. Add more context and value.'});
    deductions += 5;
  } else if (body.length >= 50) {
    checks.push({type: 'pass', label: 'Email body length acceptable', detail: 'Body content length looks reasonable for a legitimate email.'});
  }

  const score = Math.max(0, 100 - deductions);
  return {score, checks, triggeredWords};
}

function ScoreBadge({score}: {score: number}) {
  const color = score >= 80 ? 'text-ok bg-ok-surface border-ok/25' : score >= 60 ? 'text-warn bg-warn-surface border-warn/25' : 'text-err bg-err-surface border-err/25';
  const label = score >= 80 ? 'Likely Clean' : score >= 60 ? 'Risky' : 'High Spam Risk';
  return (
    <div className={`inline-flex flex-col items-center rounded-2xl border-2 px-8 py-6 ${color}`}>
      <span className={'text-5xl font-extrabold'}>{score}</span>
      <span className={'mt-1 text-ui font-semibold st'}>{label}</span>
    </div>
  );
}

const faqs: FAQ[] = [
  {
    question: 'What is a spam checker?',
    answer:
      'A spam checker analyzes email subject lines and content for characteristics that spam filters use to block or flag emails. It looks for spam trigger words, excessive capitalization, suspicious punctuation, and other signals that inbox providers associate with spam. Running your email through a spam checker before sending helps improve deliverability.',
  },
  {
    question: 'What causes emails to go to spam?',
    answer:
      'Emails land in spam for many reasons: spam trigger words in the subject or body, poor sender reputation, missing SPF/DKIM/DMARC authentication, sending to purchased or unengaged lists with high bounce rates, excessive links or images, HTML-to-text ratio issues, or being reported as spam by previous recipients. Authentication issues and sender reputation are the most common causes.',
  },
  {
    question: 'How do I check if my email will be spam?',
    answer:
      'Use a spam checker tool like this one to analyze your subject line and content. Also check your email authentication setup—verify that SPF, DKIM, and DMARC are correctly configured for your domain. Send test emails to spam testing services, and monitor your deliverability metrics (bounce rate, spam complaint rate) over time.',
  },
  {
    question: 'What are spam trigger words?',
    answer:
      'Spam trigger words are phrases commonly associated with spam emails. They include words like "free", "guaranteed", "act now", "click here", "make money", "winner", "prize", "urgent", and many others. Spam filters assign point values to these words, and emails exceeding a threshold score are flagged or blocked. Avoiding these words and using natural language improves deliverability.',
  },
  {
    question: 'Is email authentication important for avoiding spam?',
    answer:
      'Yes—email authentication (SPF, DKIM, DMARC) is critical. Without proper authentication, receiving mail servers have no way to verify your email is legitimate, making it more likely to be treated as spam. Since 2024, Gmail and Yahoo require DMARC authentication for bulk senders. Properly authenticated emails with a clean sender reputation reach the inbox far more reliably than unauthenticated emails.',
  },
];

export default function SpamCheckerPage() {
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [result, setResult] = useState<SpamResult | null>(null);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(analyzeSpam(subject, bodyText));
  };

  return (
    <>
      <NextSeo
        title="Email Spam Checker | Free Subject Line & Content Spam Test | Plunk"
        description="Free spam checker tool. Test your email subject line and content for spam trigger words, capitalization issues, and other factors that cause emails to land in spam."
        canonical="https://www.useplunk.com/tools/spam-checker"
        openGraph={{
          title: 'Email Spam Checker | Free Subject Line & Content Spam Test | Plunk',
          description: 'Free spam checker. Test your email subject line and content for factors that cause emails to land in spam folders.',
          url: 'https://www.useplunk.com/tools/spam-checker',
          images: [{url: 'https://www.useplunk.com/api/og?title=Free+Email+Spam+Checker&tag=Tool', alt: 'Plunk Spam Checker', width: 1200, height: 630}],
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
                <span className={'font-medium text-neutral-900'}>§ T-03 &nbsp;— &nbsp;Tool</span>
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
                  Email spam
                  <br />
                  checker
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Test your subject line and email content for spam trigger words, punctuation issues, and other
                  factors that cause emails to land in spam folders.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ========== CHECKER TOOL ========== */}
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
                    <ShieldAlert className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      Analyze email content
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCheck} className={'space-y-4 p-8'}>
                  <div>
                    <label htmlFor="subject" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                      Subject line <span className={'text-err'}>*</span>
                    </label>
                    <Input
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Your email subject line"
                      required
                      className={'w-full'}
                    />
                  </div>

                  <div>
                    <label htmlFor="body" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                      Email body text <span className={'text-neutral-500 text-xs font-normal'}>(optional)</span>
                    </label>
                    <textarea
                      id="body"
                      value={bodyText}
                      onChange={e => setBodyText(e.target.value)}
                      placeholder="Paste your email body text here (plain text, no HTML needed)..."
                      rows={6}
                      className={'w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-ui text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none'}
                    />
                  </div>

                  <Button type="submit" className={'w-full gap-2'}>
                    <ShieldAlert className={'h-4 w-4'} />
                    Check for spam signals
                  </Button>
                </form>
              </div>

              {result && (
                <motion.div
                  initial={{opacity: 0, y: 16}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                  className={'mt-6 space-y-4'}
                >
                  {/* Score */}
                  <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                    <div className={'flex flex-col items-center gap-4 text-center'}>
                      <ScoreBadge score={result.score} />
                      <p className={'max-w-sm text-ui text-neutral-600'}>
                        {result.score >= 80
                          ? 'Your email looks clean. No major spam signals detected.'
                          : result.score >= 60
                            ? 'Some spam signals detected. Review the issues below and consider rewriting flagged sections.'
                            : 'High spam risk. Address the issues below before sending to protect deliverability.'}
                      </p>
                    </div>
                  </div>

                  {/* Issues */}
                  <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                    <h3
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'mb-6 text-lg font-bold text-neutral-900'}
                    >
                      Detailed analysis
                    </h3>
                    <ul className={'space-y-3'}>
                      {result.checks.map((check, i) => (
                        <li key={i} className={'flex items-start gap-3'}>
                          {check.type === 'pass' ? (
                            <CheckCircle className={'mt-0.5 h-5 w-5 shrink-0 text-ok'} />
                          ) : check.type === 'warning' ? (
                            <AlertTriangle className={'mt-0.5 h-5 w-5 shrink-0 text-warn'} />
                          ) : (
                            <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-err'} />
                          )}
                          <div>
                            <p className={'text-ui font-medium text-neutral-900'}>{check.label}</p>
                            <p className={'mt-0.5 text-xs text-neutral-500'}>{check.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result.triggeredWords.length > 0 && (
                    <div className={'rounded-card border border-err/25 bg-err-surface p-6'}>
                      <h3 className={'mb-3 text-ui font-semibold text-err'}>Flagged phrases</h3>
                      <div className={'flex flex-wrap gap-2'}>
                        {result.triggeredWords.map((word, i) => (
                          <span key={i} className={'rounded-full bg-err-surface px-3 py-1 text-xs font-medium text-err'}>
                            {word}
                          </span>
                        ))}
                      </div>
                      <p className={'mt-3 text-xs text-err'}>
                        Replace these with natural, conversational language to improve deliverability.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </section>

          {/* ========== WHY EMAILS GO TO SPAM ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'Why emails go to spam.'}
                subtitle={'Spam filters look at dozens of signals. Content is just one part of the picture.'}
              />

              <div className={'mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
                {[
                  {
                    title: 'Spam trigger words',
                    body: 'Words like "free", "guaranteed", "click here", and "act now" score heavily with spam filters. Even one or two can tip the scales.',
                  },
                  {
                    title: 'Missing authentication',
                    body: 'Without SPF, DKIM, and DMARC configured, receiving servers cannot verify your email is legitimate. Authentication failures are the leading cause of spam classification.',
                  },
                  {
                    title: 'Poor sender reputation',
                    body: 'Email providers track bounce rates, spam complaints, and engagement over time. A low sender reputation score means even clean emails land in spam.',
                  },
                  {
                    title: 'Excessive capitalization',
                    body: 'ALL CAPS SUBJECT LINES and words in all caps look like shouting and are heavily penalized by spam filters. Use sentence case.',
                  },
                  {
                    title: 'High bounce & complaint rates',
                    body: 'If many recipients report your emails as spam or addresses bounce, providers penalize future emails from your domain.',
                  },
                  {
                    title: 'Purchased email lists',
                    body: 'Bought lists have unverified addresses, old data, and spam traps. Sending to them destroys your sender reputation quickly.',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1]}}
                    className={
                      'flex flex-col gap-4 rounded-card border border-neutral-200 bg-white p-8'
                    }
                  >
                    <h3
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-h3 font-bold tracking-[-0.02em] text-neutral-900'}
                    >
                      {item.title}
                    </h3>
                    <p className={'text-ui leading-relaxed text-neutral-600'}>{item.body}</p>
                  </motion.div>
                ))}
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
                  Send emails that reach the inbox.
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Plunk automatically handles SPF, DKIM, and DMARC authentication — the most critical deliverability
                    factor. Start free, no credit card required.
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
                    <Link
                      href="/guides/email-deliverability"
                      className={
                        'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'
                      }
                    >
                      Deliverability guide
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <FAQSection faqs={faqs} schemaId="faq-spam-checker" />

      <Footer />
    </>
  );
}
