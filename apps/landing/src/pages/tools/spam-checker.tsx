import {
  FAQSection,
  FeatureCTA,
  Footer,
  MoreTools,
  Navbar,
  ToolExplainer,
  ToolFinding,
  ToolHero,
  ToolPanel,
  ToolResult,
  ToolVerdict,
} from '../../components';
import type {FAQ, ToolTone} from '../../components';
import {motion} from 'framer-motion';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {Button, Input, Textarea} from '@plunk/ui';

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

function scoreVerdict(score: number): {tone: ToolTone; title: string; detail: string} {
  if (score >= 80) {
    return {
      tone: 'ok',
      title: `Likely clean, ${score} out of 100`,
      detail: 'Your email looks clean. No major spam signals detected.',
    };
  }
  if (score >= 60) {
    return {
      tone: 'warn',
      title: `Some spam risk, ${score} out of 100`,
      detail: 'Some spam signals detected. Review the issues below and consider rewriting flagged sections.',
    };
  }
  return {
    tone: 'err',
    title: `High spam risk, ${score} out of 100`,
    detail: 'High spam risk. Address the issues below before sending to protect deliverability.',
  };
}

const CHECK_TONE = {pass: 'ok', warning: 'warn', error: 'err'} as const;

const explainer = [
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
];

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
        title="Free Email Spam Checker & Subject Line Test | Plunk"
        description="Free spam checker tool. Test your email subject line and content for spam trigger words, capitalization issues, and other factors that cause emails to land in spam."
        canonical="https://www.useplunk.com/tools/spam-checker"
        openGraph={{
          title: 'Free Email Spam Checker & Subject Line Test | Plunk',
          description: 'Free spam checker. Test your email subject line and content for factors that cause emails to land in spam folders.',
          url: 'https://www.useplunk.com/tools/spam-checker',
          images: [{url: 'https://www.useplunk.com/api/og?title=Free+Email+Spam+Checker&tag=Tool', alt: 'Plunk Spam Checker', width: 1200, height: 630}],
        }}
      />

      <Navbar />

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'Email spam checker'}
            subtitle={
              'Test a subject line and body for trigger words, shouty punctuation and the other signals that send email to spam.'
            }
          >
            <ToolPanel>
              <form onSubmit={handleCheck} className={'flex flex-col gap-4'}>
                <div>
                  <label htmlFor="subject" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                    Subject line
                  </label>
                  <Input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Your email subject line"
                    required
                    className={'h-11'}
                  />
                </div>

                <div>
                  <label htmlFor="body" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                    Body <span className={'font-normal text-neutral-500'}>(optional)</span>
                  </label>
                  <Textarea
                    id="body"
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    placeholder="Paste your email body as plain text"
                    rows={6}
                    className={'resize-y text-ui'}
                  />
                </div>

                <Button type="submit" className={'h-11 px-6'}>
                  Check for spam
                </Button>
              </form>
            </ToolPanel>

            {result && (
              <motion.div
                initial={{opacity: 0, y: 12}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
                className={'mt-6 flex flex-col gap-4'}
              >
                <ToolVerdict {...scoreVerdict(result.score)} />

                <ToolResult title={'What we found'}>
                  <ul className={'flex flex-col gap-4'}>
                    {result.checks.map((check, i) => (
                      <ToolFinding key={i} tone={CHECK_TONE[check.type]} label={check.label} detail={check.detail} />
                    ))}
                  </ul>
                </ToolResult>

                {result.triggeredWords.length > 0 && (
                  <ToolResult title={'Flagged phrases'}>
                    <ul className={'flex flex-wrap gap-2'}>
                      {result.triggeredWords.map((word, i) => (
                        <li
                          key={i}
                          className={'rounded-md bg-neutral-100 px-2 py-1 font-code text-ui text-neutral-800'}
                        >
                          {word}
                        </li>
                      ))}
                    </ul>
                    <p className={'mt-4 text-ui text-neutral-600'}>
                      Replace these with natural, conversational language to improve deliverability.
                    </p>
                  </ToolResult>
                )}
              </motion.div>
            )}
          </ToolHero>

          <ToolExplainer
            title={'Why emails go to spam'}
            subtitle={'Spam filters look at dozens of signals. Content is just one part of the picture.'}
            items={explainer}
          />

          <MoreTools current={'spam-checker'} />

          <FAQSection faqs={faqs} schemaId="faq-spam-checker" />

          <FeatureCTA
            title={'Send emails that reach the inbox.'}
            body={
              'Plunk automatically handles SPF, DKIM, and DMARC authentication, the most critical deliverability factor. Start free, no credit card required.'
            }
            secondary={{href: '/guides/email-deliverability', label: 'Deliverability guide'}}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
