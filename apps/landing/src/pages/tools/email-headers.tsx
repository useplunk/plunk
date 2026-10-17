import {
  FAQSection,
  FeatureCTA,
  Footer,
  MoreTools,
  Navbar,
  ToolExplainer,
  ToolHero,
  ToolPanel,
  ToolPill,
  ToolResult,
  ToolVerdict,
} from '../../components';
import type {FAQ, ToolTone} from '../../components';
import {motion} from 'framer-motion';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {Button, Textarea} from '@plunk/ui';

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

function authTone(pass: boolean | null): ToolTone {
  return pass === true ? 'ok' : pass === false ? 'err' : 'warn';
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function authVerdict(results: AuthResult[]): {tone: ToolTone; title: string; detail: string} {
  if (results.length === 0) {
    return {
      tone: 'warn',
      title: 'No authentication results found',
      detail:
        'The receiving server adds an Authentication-Results header. If it is missing, paste the full original headers, not just the visible ones.',
    };
  }

  const names = (list: AuthResult[]) => list.map(r => r.mechanism.toUpperCase()).join(', ');
  const failed = results.filter(r => r.pass === false);
  const unclear = results.filter(r => r.pass === null);
  const missing = (['spf', 'dkim', 'dmarc'] as const).filter(m => !results.some(r => r.mechanism === m));
  const missingNote = missing.length > 0 ? ` No ${missing.map(m => m.toUpperCase()).join(' or ')} result in the header.` : '';

  if (failed.length > 0) {
    return {
      tone: 'err',
      title: 'Authentication failed',
      detail: `${names(failed)} did not pass, so receivers are more likely to send this message to spam.${missingNote}`,
    };
  }
  if (unclear.length > 0) {
    return {
      tone: 'warn',
      title: 'Authentication is inconclusive',
      detail: `${names(unclear)} returned neither pass nor fail.${missingNote}`,
    };
  }
  return {
    tone: 'ok',
    title: 'Authentication passed',
    detail: `${names(results)} passed for this message.${missingNote}`,
  };
}

const explainer = [
  {
    title: 'SPF, DKIM & DMARC',
    body: 'The Authentication-Results header is your first stop. It shows whether the sending server was authorised (SPF), the signature was valid (DKIM), and whether both align with the From domain (DMARC).',
  },
  {
    title: 'Received chain',
    body: 'Received headers trace the path of your email from origin to inbox. Read them bottom-to-top. Large time gaps reveal where delays happened — useful for diagnosing why an email arrived late.',
  },
  {
    title: 'Return-Path & Reply-To',
    body: 'Return-Path is where bounces go — it must pass SPF. Reply-To overrides where replies are sent. A mismatch between From, Return-Path, and Reply-To can trigger spam filters or indicate phishing.',
  },
];

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

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'Email headers analyzer'}
            subtitle={
              'Paste raw headers to see SPF, DKIM and DMARC results, the route a message took, and who signed it.'
            }
          >
            <ToolPanel>
              <form onSubmit={handleAnalyze} className={'flex flex-col gap-4'}>
                <div>
                  <label htmlFor="rawHeaders" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                    Raw email headers
                  </label>
                  <Textarea
                    id="rawHeaders"
                    value={raw}
                    onChange={e => setRaw(e.target.value)}
                    placeholder={
                      'Paste raw headers here.\n\nIn Gmail: ⋮ menu → Show original\nIn Outlook: File → Properties → Internet headers\nIn Apple Mail: View → Message → All Headers'
                    }
                    required
                    rows={10}
                    className={'resize-y font-code text-ui'}
                  />
                  <p className={'mt-2 text-ui text-neutral-500'}>
                    Headers only, no body needed. Everything is processed in your browser.
                  </p>
                </div>
                <div className={'flex gap-3'}>
                  <Button type="submit" className={'h-11 flex-1 px-6'}>
                    Analyze
                  </Button>
                  {analysed && (
                    <Button type="button" variant="outline" className={'h-11 px-6'} onClick={handleClear}>
                      Clear
                    </Button>
                  )}
                </div>
              </form>
            </ToolPanel>

            {analysed && (
              <motion.div
                initial={{opacity: 0, y: 12}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
                className={'mt-6 flex flex-col gap-4'}
              >
                {!result ? (
                  <ToolVerdict
                    tone={'err'}
                    title={'Could not read these headers'}
                    detail={
                      'Paste raw email headers in the standard format: one header per line, a name, a colon, then the value.'
                    }
                  />
                ) : (
                  <>
                    <ToolVerdict {...authVerdict(result.authResults)} />

                    {result.authResults.length > 0 && (
                      <ToolResult title={'Authentication'}>
                        <ul className={'divide-y divide-neutral-100'}>
                          {result.authResults.map((auth, i) => (
                            <li key={i} className={'flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0'}>
                              <span className={'w-14 text-ui font-semibold text-neutral-900'}>
                                {auth.mechanism.toUpperCase()}
                              </span>
                              <ToolPill tone={authTone(auth.pass)}>{capitalise(auth.result)}</ToolPill>
                              {auth.detail && (
                                <span className={'min-w-0 break-all font-code text-ui text-neutral-500'}>
                                  {auth.detail}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </ToolResult>
                    )}

                    {(result.dkimDomain ?? result.dkimSelector) && (
                      <ToolResult title={'DKIM signature'}>
                        <dl className={'divide-y divide-neutral-100'}>
                          {result.dkimDomain && (
                            <div className={'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4'}>
                              <dt className={'w-36 flex-shrink-0 text-ui text-neutral-500'}>Signing domain</dt>
                              <dd className={'min-w-0 break-all font-code text-ui text-neutral-900'}>
                                {result.dkimDomain}
                              </dd>
                            </div>
                          )}
                          {result.dkimSelector && (
                            <div className={'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4'}>
                              <dt className={'w-36 flex-shrink-0 text-ui text-neutral-500'}>Selector</dt>
                              <dd className={'min-w-0 break-all font-code text-ui text-neutral-900'}>
                                {result.dkimSelector}
                              </dd>
                            </div>
                          )}
                          {result.dkimDomain && result.dkimSelector && (
                            <div className={'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4'}>
                              <dt className={'w-36 flex-shrink-0 text-ui text-neutral-500'}>Public key DNS name</dt>
                              <dd className={'min-w-0 break-all font-code text-ui text-neutral-900'}>
                                {result.dkimSelector}._domainkey.{result.dkimDomain}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </ToolResult>
                    )}

                    {result.hops.length > 0 && (
                      <ToolResult
                        title={`Route through ${result.hops.length} server${result.hops.length !== 1 ? 's' : ''}`}
                      >
                        <ol className={'divide-y divide-neutral-100'}>
                          {result.hops.map((hop, i) => (
                            <li key={i} className={'flex items-start gap-4 py-3 first:pt-0 last:pb-0'}>
                              <span className={'w-5 flex-shrink-0 font-code text-ui text-neutral-400'}>{i + 1}</span>
                              <div className={'min-w-0 flex-1 text-ui'}>
                                <p className={'flex gap-2'}>
                                  <span className={'w-10 flex-shrink-0 text-neutral-500'}>From</span>
                                  <span className={'truncate font-code text-neutral-900'}>{hop.from}</span>
                                </p>
                                <p className={'mt-1 flex gap-2'}>
                                  <span className={'w-10 flex-shrink-0 text-neutral-500'}>By</span>
                                  <span className={'truncate font-code text-neutral-900'}>{hop.by}</span>
                                </p>
                              </div>
                              {hop.timestamp && (
                                <span className={'flex-shrink-0 font-code text-ui text-neutral-500'}>
                                  {hop.timestamp}
                                </span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </ToolResult>
                    )}

                    {metaFields.length > 0 && (
                      <ToolResult title={'Message details'}>
                        <dl className={'divide-y divide-neutral-100'}>
                          {metaFields.map(field => (
                            <div
                              key={field.label}
                              className={'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4'}
                            >
                              <dt className={'w-36 flex-shrink-0 text-ui text-neutral-500'}>{field.label}</dt>
                              <dd className={'min-w-0 break-all font-code text-ui text-neutral-900'}>{field.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </ToolResult>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </ToolHero>

          <ToolExplainer
            title={'What headers tell you'}
            subtitle={'Every email carries a forensic trail. Here’s what to look for when debugging deliverability.'}
            items={explainer}
          />

          <MoreTools current={'email-headers'} />

          <FAQSection faqs={faqs} schemaId="faq-email-headers" />

          <FeatureCTA
            title={'Never debug deliverability again.'}
            body={
              'Plunk sets up authentication correctly from day one and gives you the analytics to catch deliverability issues before your users do.'
            }
            secondary={{href: '/tools/dkim-checker', label: 'Check DKIM record'}}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
