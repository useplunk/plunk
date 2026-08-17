import {FAQSection, Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {AlertTriangle, ArrowRight, CheckCircle, FileText, XCircle} from 'lucide-react';
import {Button} from '@plunk/ui';
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

interface AuthResult {
  mechanism: 'spf' | 'dkim' | 'dmarc';
  result: string;
  detail: string;
  pass: boolean | null;
}

interface ReceivedHop {
  from: string;
  by: string;
  timestamp: string | null;
  raw: string;
}

interface ParsedHeaders {
  from: string | null;
  to: string | null;
  subject: string | null;
  date: string | null;
  messageId: string | null;
  replyTo: string | null;
  returnPath: string | null;
  xMailer: string | null;
  dkimSelector: string | null;
  dkimDomain: string | null;
  authResults: AuthResult[];
  hops: ReceivedHop[];
}

function parseRawHeaders(raw: string): Record<string, string[]> {
  const headers: Record<string, string[]> = {};
  const lines = raw.split(/\r?\n/);
  let currentKey = '';
  let currentValue = '';

  for (const line of lines) {
    if (/^\s/.test(line) && currentKey) {
      currentValue += ' ' + line.trim();
    } else {
      if (currentKey) {
        const existing = headers[currentKey];
        if (existing) existing.push(currentValue.trim());
        else headers[currentKey] = [currentValue.trim()];
      }
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        currentKey = line.slice(0, colonIdx).trim().toLowerCase();
        currentValue = line.slice(colonIdx + 1).trim();
      } else {
        currentKey = '';
        currentValue = '';
      }
    }
  }
  if (currentKey) {
    const existing = headers[currentKey];
    if (existing) existing.push(currentValue.trim());
    else headers[currentKey] = [currentValue.trim()];
  }
  return headers;
}

function parseAuthResults(authHeader: string): AuthResult[] {
  const results: AuthResult[] = [];
  const lower = authHeader.toLowerCase();

  const mechanisms: Array<'spf' | 'dkim' | 'dmarc'> = ['spf', 'dkim', 'dmarc'];
  for (const mech of mechanisms) {
    const mechIdx = lower.indexOf(mech + '=');
    if (mechIdx === -1) continue;

    const afterMech = authHeader.slice(mechIdx + mech.length + 1);
    const resultMatch = /^(\w+)/.exec(afterMech);
    const result = resultMatch?.[1]?.toLowerCase() ?? 'unknown';

    const pass =
      result === 'pass'
        ? true
        : result === 'fail' || result === 'hardfail' || result === 'none'
        ? false
        : null;

    let detail = '';
    if (mech === 'spf') {
      const smtpMatch = /smtp\.mailfrom\s*=\s*([^\s;]+)/i.exec(authHeader.slice(mechIdx));
      if (smtpMatch?.[1]) detail = `smtp.mailfrom=${smtpMatch[1]}`;
    } else if (mech === 'dkim') {
      const headerMatch = /header\.i\s*=\s*([^\s;]+)/i.exec(authHeader.slice(mechIdx));
      if (headerMatch?.[1]) detail = `header.i=${headerMatch[1]}`;
    } else if (mech === 'dmarc') {
      const headerMatch = /header\.from\s*=\s*([^\s;]+)/i.exec(authHeader.slice(mechIdx));
      if (headerMatch?.[1]) detail = `header.from=${headerMatch[1]}`;
    }

    results.push({mechanism: mech, result, detail, pass});
  }

  return results;
}

function parseReceivedHop(receivedValue: string): ReceivedHop {
  const fromMatch = /from\s+([^\s]+)/i.exec(receivedValue);
  const byMatch = /by\s+([^\s]+)/i.exec(receivedValue);

  const datePattern = /;\s*(.+)$/;
  const dateMatch = datePattern.exec(receivedValue);
  let timestamp: string | null = null;
  if (dateMatch?.[1]) {
    const parsed = new Date(dateMatch[1].trim());
    if (!isNaN(parsed.getTime())) {
      timestamp = parsed.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      });
    }
  }

  return {
    from: fromMatch?.[1] ?? '(unknown)',
    by: byMatch?.[1] ?? '(unknown)',
    timestamp,
    raw: receivedValue,
  };
}

function parseDkimSignature(dkimValue: string): {selector: string | null; domain: string | null} {
  const sMatch = /\bs\s*=\s*([^;\s]+)/i.exec(dkimValue);
  const dMatch = /\bd\s*=\s*([^;\s]+)/i.exec(dkimValue);
  return {selector: sMatch?.[1] ?? null, domain: dMatch?.[1] ?? null};
}

function analyzeHeaders(raw: string): ParsedHeaders | null {
  if (!raw.trim()) return null;

  const headers = parseRawHeaders(raw);
  const first = (key: string) => headers[key]?.[0] ?? null;

  const authHeader = first('authentication-results');
  const authResults = authHeader ? parseAuthResults(authHeader) : [];

  const receivedHeaders = headers['received'] ?? [];
  const hops = receivedHeaders.map(parseReceivedHop).reverse();

  const dkimSig = first('dkim-signature');
  const {selector, domain} = dkimSig ? parseDkimSignature(dkimSig) : {selector: null, domain: null};

  return {
    from: first('from'),
    to: first('to'),
    subject: first('subject'),
    date: first('date'),
    messageId: first('message-id'),
    replyTo: first('reply-to'),
    returnPath: first('return-path'),
    xMailer: first('x-mailer') ?? first('x-mailing-list') ?? null,
    dkimSelector: selector,
    dkimDomain: domain,
    authResults,
    hops,
  };
}

function AuthBadge({result}: {result: string}) {
  const pass = result === 'pass';
  const fail = result === 'fail' || result === 'hardfail';
  const cls = pass
    ? 'bg-ok-surface text-ok'
    : fail
    ? 'bg-err-surface text-err'
    : 'bg-neutral-100 text-neutral-600';
  return (
    <span style={{fontFamily: 'var(--font-mono)'}} className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${cls}`}>
      {result}
    </span>
  );
}

const faqs: FAQ[] = [
  {
    question: 'Where do I find the raw email headers?',
    answer: 'In Gmail: open the email, click the three-dot menu (⋮), choose "Show original". In Outlook: open the email, click File → Properties, and copy the "Internet headers" box. In Apple Mail: with the email open, go to View → Message → All Headers. The raw headers appear at the top of the message source.',
  },
  {
    question: 'What do the Authentication-Results headers mean?',
    answer: 'Authentication-Results is added by the receiving mail server and summarises the SPF, DKIM, and DMARC check results. "pass" means the check succeeded. "fail" or "hardfail" means it failed. "none" means no record was found. If DMARC passes but SPF or DKIM fails, check that your sending domain aligns with the From header.',
  },
  {
    question: 'How do I read the Received chain?',
    answer: 'Received headers are added by each mail server the message passed through, with the most recent at the top. Reading them bottom-to-top gives you the routing path from sender to inbox. Large time gaps between hops indicate server delays or queuing. The very first Received header shows where the message originated.',
  },
  {
    question: 'Why does email land in spam even though SPF and DKIM pass?',
    answer: 'Authentication passing is necessary but not sufficient. Spam filters also consider sender reputation, IP blacklist status, content quality, engagement history, and DMARC alignment. A brand-new IP, a domain with no sending history, or content with many spam trigger words can cause filtering even with perfect authentication.',
  },
  {
    question: 'What is the DKIM-Signature header?',
    answer: 'DKIM-Signature contains a cryptographic signature applied by the sending server. The "d=" tag identifies the signing domain and "s=" is the selector used to locate the public key in DNS. Receiving servers verify the signature against the public key at <selector>._domainkey.<domain>. A mismatch or missing key causes a DKIM fail.',
  },
];

export default function EmailHeadersPage() {
  const [raw, setRaw] = useState('');
  const [result, setResult] = useState<ParsedHeaders | null>(null);
  const [analysed, setAnalysed] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = analyzeHeaders(raw);
    setResult(parsed);
    setAnalysed(true);
  };

  const handleClear = () => {
    setRaw('');
    setResult(null);
    setAnalysed(false);
  };

  const metaFields: Array<{label: string; value: string | null}> = result
    ? [
        {label: 'From', value: result.from},
        {label: 'To', value: result.to},
        {label: 'Subject', value: result.subject},
        {label: 'Date', value: result.date},
        {label: 'Message-ID', value: result.messageId},
        {label: 'Reply-To', value: result.replyTo},
        {label: 'Return-Path', value: result.returnPath},
        {label: 'X-Mailer', value: result.xMailer},
      ].filter(f => f.value !== null)
    : [];

  return (
    <>
      <NextSeo
        title="Email Headers Analyzer | Parse & Debug Email Headers | Plunk"
        description="Free email headers analyzer. Paste raw email headers and get a parsed breakdown of SPF, DKIM, and DMARC results, routing hops, and authentication chain. No sign-up required."
        canonical="https://www.useplunk.com/tools/email-headers"
        openGraph={{
          title: 'Email Headers Analyzer | Parse & Debug Email Headers | Plunk',
          description: 'Paste raw email headers and instantly see SPF/DKIM/DMARC results, routing hops, and authentication chain. Free, no sign-up.',
          url: 'https://www.useplunk.com/tools/email-headers',
          images: [{url: 'https://www.useplunk.com/api/og?title=Email+Headers+Analyzer&tag=Tool', alt: 'Plunk Email Headers Analyzer', width: 1200, height: 630}],
        }}
      />

      <Navbar />

      <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <main className={'text-neutral-800'}>
          {/* ========== HERO ========== */}
          <section className={'relative overflow-hidden'}>
            <div
              aria-hidden
              className={'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'}
            />

            <div className={'mx-auto max-w-[88rem] px-6 pb-24 pt-20 sm:px-10 sm:pt-28 lg:pb-36'}>
              <motion.div
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                style={{fontFamily: 'var(--font-mono)'}}
                className={'mb-16 flex items-center justify-between border-t border-neutral-900/90 pt-4 text-label text-neutral-700 sm:mb-24'}
              >
                <span className={'font-medium text-neutral-900'}>§ T-09 &nbsp;— &nbsp;Tool</span>
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
                  className={'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'}
                >
                  Email headers
                  <br />
                  analyzer
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Paste raw email headers and get a parsed breakdown of SPF, DKIM, and DMARC results, routing hops with timestamps, and the full authentication chain.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ========== TOOL ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mx-auto max-w-3xl'}
            >
              <div className={'overflow-hidden rounded-card border border-neutral-200 bg-white'}>
                <div className={'border-b border-neutral-200 px-8 py-5'}>
                  <div className={'flex items-center gap-3'}>
                    <FileText className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>
                      Raw header input
                    </span>
                  </div>
                </div>

                <form onSubmit={handleAnalyze} className={'p-8'}>
                  <div className={'space-y-4'}>
                    <div>
                      <label htmlFor="rawHeaders" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                        Raw email headers <span className={'text-err'}>*</span>
                      </label>
                      <textarea
                        id="rawHeaders"
                        value={raw}
                        onChange={e => setRaw(e.target.value)}
                        placeholder={'Paste raw headers here.\n\nIn Gmail: ⋮ menu → Show original\nIn Outlook: File → Properties → Internet headers\nIn Apple Mail: View → Message → All Headers'}
                        required
                        rows={10}
                        style={{fontFamily: 'var(--font-mono)'}}
                        className={'w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-700 placeholder:text-neutral-500 focus:border-neutral-400 focus:bg-white focus:outline-none'}
                      />
                      <p className={'mt-1.5 text-xs text-neutral-500'}>Paste the full raw headers — no email body required. Everything is processed locally in your browser.</p>
                    </div>
                    <div className={'flex gap-3'}>
                      <Button type="submit" className={'flex-1 gap-2'}>
                        <FileText className={'h-4 w-4'} />
                        Analyze headers
                      </Button>
                      {analysed && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className={'rounded-full border border-neutral-200 px-5 py-2.5 text-ui font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900'}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {analysed && result && (
                <motion.div
                  initial={{opacity: 0, y: 16}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                  className={'mt-6 space-y-4'}
                >
                  {/* Authentication results */}
                  {result.authResults.length > 0 && (
                    <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                      <h3 style={{fontFamily: 'var(--font-display)'}} className={'mb-6 text-lg font-bold text-neutral-900'}>
                        Authentication results
                      </h3>
                      <ul className={'space-y-3'}>
                        {result.authResults.map((auth, i) => (
                          <li key={i} className={'flex items-start gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                            {auth.pass === true ? (
                              <CheckCircle className={'mt-0.5 h-4 w-4 shrink-0 text-ok'} />
                            ) : auth.pass === false ? (
                              <XCircle className={'mt-0.5 h-4 w-4 shrink-0 text-err'} />
                            ) : (
                              <AlertTriangle className={'mt-0.5 h-4 w-4 shrink-0 text-warn'} />
                            )}
                            <div className={'min-w-0 flex-1'}>
                              <div className={'flex flex-wrap items-center gap-2'}>
                                <span style={{fontFamily: 'var(--font-mono)'}} className={'text-xs font-bold text-neutral-700'}>
                                  {auth.mechanism}
                                </span>
                                <AuthBadge result={auth.result} />
                                {auth.detail && (
                                  <span style={{fontFamily: 'var(--font-mono)'}} className={'text-xs text-neutral-500'}>
                                    {auth.detail}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.authResults.length === 0 && (
                    <div className={'rounded-card border border-neutral-100 bg-neutral-50 p-6'}>
                      <div className={'flex items-start gap-3'}>
                        <AlertTriangle className={'mt-0.5 h-5 w-5 shrink-0 text-warn'} />
                        <div>
                          <p className={'text-ui font-medium text-neutral-800'}>No Authentication-Results header found</p>
                          <p className={'mt-0.5 text-xs text-neutral-500'}>This header is added by the receiving mail server. If it&apos;s missing, paste the full original headers, not just the visible ones.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DKIM signature info */}
                  {(result.dkimDomain ?? result.dkimSelector) && (
                    <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                      <h3 style={{fontFamily: 'var(--font-display)'}} className={'mb-4 text-lg font-bold text-neutral-900'}>
                        DKIM signature
                      </h3>
                      <div className={'flex flex-wrap gap-4'}>
                        {result.dkimDomain && (
                          <div className={'rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                            <p className={'text-label text-neutral-500'}>Signing domain</p>
                            <p style={{fontFamily: 'var(--font-mono)'}} className={'mt-1 text-ui font-medium text-neutral-900'}>{result.dkimDomain}</p>
                          </div>
                        )}
                        {result.dkimSelector && (
                          <div className={'rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                            <p className={'text-label text-neutral-500'}>Selector</p>
                            <p style={{fontFamily: 'var(--font-mono)'}} className={'mt-1 text-ui font-medium text-neutral-900'}>{result.dkimSelector}</p>
                          </div>
                        )}
                        {result.dkimDomain && result.dkimSelector && (
                          <div className={'rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                            <p className={'text-label text-neutral-500'}>Public key DNS name</p>
                            <p style={{fontFamily: 'var(--font-mono)'}} className={'mt-1 text-ui font-medium text-neutral-900'}>
                              {result.dkimSelector}._domainkey.{result.dkimDomain}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Routing hops */}
                  {result.hops.length > 0 && (
                    <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                      <h3 style={{fontFamily: 'var(--font-display)'}} className={'mb-6 text-lg font-bold text-neutral-900'}>
                        Routing hops <span className={'text-base font-normal text-neutral-500'}>({result.hops.length} server{result.hops.length !== 1 ? 's' : ''})</span>
                      </h3>
                      <ol className={'space-y-3'}>
                        {result.hops.map((hop, i) => (
                          <li key={i} className={'flex gap-4'}>
                            <div className={'flex flex-col items-center'}>
                              <div className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white'}>
                                <span style={{fontFamily: 'var(--font-mono)'}} className={'text-[10px] font-bold text-neutral-500'}>
                                  {i + 1}
                                </span>
                              </div>
                              {i < result.hops.length - 1 && <div className={'mt-1 h-full w-px bg-neutral-200'} />}
                            </div>
                            <div className={'min-w-0 flex-1 pb-3'}>
                              <div className={'rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                                <div className={'flex flex-wrap items-start justify-between gap-2'}>
                                  <div className={'min-w-0'}>
                                    <p className={'text-label text-neutral-500'}>From</p>
                                    <p style={{fontFamily: 'var(--font-mono)'}} className={'mt-0.5 truncate text-xs font-medium text-neutral-800'}>{hop.from}</p>
                                  </div>
                                  <div className={'min-w-0'}>
                                    <p className={'text-label text-neutral-500'}>By</p>
                                    <p style={{fontFamily: 'var(--font-mono)'}} className={'mt-0.5 truncate text-xs font-medium text-neutral-800'}>{hop.by}</p>
                                  </div>
                                  {hop.timestamp && (
                                    <div className={'shrink-0'}>
                                      <p className={'text-label text-neutral-500'}>Time</p>
                                      <p style={{fontFamily: 'var(--font-mono)'}} className={'mt-0.5 text-xs text-neutral-600'}>{hop.timestamp}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Message metadata */}
                  {metaFields.length > 0 && (
                    <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                      <h3 style={{fontFamily: 'var(--font-display)'}} className={'mb-6 text-lg font-bold text-neutral-900'}>
                        Message metadata
                      </h3>
                      <dl className={'space-y-3'}>
                        {metaFields.map(field => (
                          <div key={field.label} className={'flex flex-col gap-1 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 sm:flex-row sm:gap-4'}>
                            <dt style={{fontFamily: 'var(--font-mono)'}} className={'w-28 shrink-0 text-xs font-bold text-neutral-500'}>
                              {field.label}
                            </dt>
                            <dd style={{fontFamily: 'var(--font-mono)'}} className={'min-w-0 break-all text-xs text-neutral-800'}>
                              {field.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </motion.div>
              )}

              {analysed && !result && (
                <motion.div
                  initial={{opacity: 0, y: 16}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                  className={'mt-6 rounded-card border border-err/25 bg-err-surface p-8'}
                >
                  <div className={'flex items-start gap-3'}>
                    <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-err'} />
                    <div>
                      <p className={'font-semibold text-err'}>Could not parse headers</p>
                      <p className={'mt-1 text-ui text-err'}>Make sure you pasted raw email headers in standard format. Each header should be on its own line followed by a colon and value.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </section>

          {/* ========== EDUCATION ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'What headers tell you.'}
                subtitle={'Every email carries a forensic trail. Here\'s what to look for when debugging deliverability.'}
              />

              <div className={'mt-20 grid gap-6 sm:grid-cols-3'}>
                {[
                  {
                    tag: 'Authentication',
                    title: 'SPF, DKIM & DMARC',
                    body: 'The Authentication-Results header is your first stop. It shows whether the sending server was authorised (SPF), the signature was valid (DKIM), and whether both align with the From domain (DMARC).',
                    cls: 'border-neutral-300',
                  },
                  {
                    tag: 'Routing',
                    title: 'Received chain',
                    body: 'Received headers trace the path of your email from origin to inbox. Read them bottom-to-top. Large time gaps reveal where delays happened — useful for diagnosing why an email arrived late.',
                    cls: 'border-neutral-300',
                  },
                  {
                    tag: 'Identity',
                    title: 'Return-Path & Reply-To',
                    body: 'Return-Path is where bounces go — it must pass SPF. Reply-To overrides where replies are sent. A mismatch between From, Return-Path, and Reply-To can trigger spam filters or indicate phishing.',
                    cls: 'border-neutral-300',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.tag}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1]}}
                    className={`flex flex-col gap-5 rounded-card border-2 bg-white p-8 ${item.cls}`}
                  >
                    <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>
                      / {item.tag}
                    </span>
                    <h3 style={{fontFamily: 'var(--font-display)'}} className={'text-2xl font-bold tracking-[-0.02em] text-neutral-900'}>
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
                  Never debug deliverability again.
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Plunk sets up authentication correctly from day one and gives you the analytics to catch deliverability issues before your users do.
                  </p>
                  <div className={'flex flex-wrap gap-3'}>
                    <motion.a
                      whileHover={{scale: 1.015}}
                      whileTap={{scale: 0.985}}
                      href={`${DASHBOARD_URI}/auth/signup`}
                      className={'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'}
                    >
                      Start with Plunk
                      <ArrowRight className={'h-4 w-4'} />
                    </motion.a>
                    <Link
                      href="/tools/dkim-checker"
                      className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}
                    >
                      Check DKIM record
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <FAQSection faqs={faqs} schemaId="faq-email-headers" />
      <Footer />
    </>
  );
}
