import {FAQSection, Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {AlertTriangle, ArrowRight, CheckCircle, Shield, XCircle} from 'lucide-react';
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

interface SpfMechanism {
  qualifier: string;
  type: string;
  value: string;
}

interface SpfIssue {
  type: 'error' | 'warning' | 'pass';
  label: string;
  detail: string;
}

interface ParsedSpf {
  mechanisms: SpfMechanism[];
  allMechanism: string | null;
  issues: SpfIssue[];
  lookupCount: number;
  grade: 'pass' | 'warning' | 'fail';
}

const DNS_LOOKUP_MECHS = new Set(['include', 'a', 'mx', 'ptr', 'exists', 'redirect']);

function parseSpfRecord(record: string): ParsedSpf {
  const parts = record.split(/\s+/);
  const mechanisms: SpfMechanism[] = [];
  let allMechanism: string | null = null;
  const issues: SpfIssue[] = [];
  let lookupCount = 0;

  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower === '+all' || lower === '-all' || lower === '~all' || lower === '?all' || lower === 'all') {
      allMechanism = lower === 'all' ? '+all' : lower;
      continue;
    }

    let qualifier = '+';
    let mech = part;
    const firstChar = part[0] ?? '';
    if (['+', '-', '~', '?'].includes(firstChar)) {
      qualifier = firstChar;
      mech = part.slice(1);
    }

    const colonIdx = mech.indexOf(':');
    const slashIdx = mech.indexOf('/');
    const endIdx = colonIdx > -1 ? colonIdx : slashIdx > -1 ? slashIdx : mech.length;
    const type = mech.slice(0, endIdx).toLowerCase();
    const value = colonIdx > -1 ? mech.slice(colonIdx + 1) : '';

    if (DNS_LOOKUP_MECHS.has(type)) lookupCount++;

    mechanisms.push({qualifier, type, value});
  }

  // Analyze
  if (!allMechanism) {
    issues.push({type: 'warning', label: 'No "all" mechanism', detail: 'SPF records should end with -all, ~all, or ?all to define default behaviour for unlisted senders.'});
  } else if (allMechanism === '+all') {
    issues.push({type: 'error', label: '+all allows any server to send', detail: '+all means any mail server in the world can send email claiming to be from your domain, completely defeating SPF protection.'});
  } else if (allMechanism === '?all') {
    issues.push({type: 'warning', label: '?all is too permissive', detail: '?all (neutral) gives no protection. Consider upgrading to ~all (softfail) or -all (hard fail).'});
  } else if (allMechanism === '~all') {
    issues.push({type: 'warning', label: '~all softfail is acceptable but not optimal', detail: 'Softfail marks unauthorised senders as suspicious but still delivers them. Prefer -all for maximum protection once your legitimate senders are configured.'});
  } else if (allMechanism === '-all') {
    issues.push({type: 'pass', label: '-all hard fail is the strongest policy', detail: 'Mail servers are instructed to reject email from any server not listed in your SPF record.'});
  }

  if (lookupCount > 8) {
    issues.push({type: 'error', label: `DNS lookup limit exceeded (${lookupCount}/10)`, detail: `SPF is limited to 10 DNS lookups. Exceeding this causes a PermError, making SPF fail permanently. Consolidate includes or use IP ranges.`});
  } else if (lookupCount > 6) {
    issues.push({type: 'warning', label: `Approaching DNS lookup limit (${lookupCount}/10)`, detail: 'Adding more senders could push you over the 10 lookup limit. Monitor and consolidate where possible.'});
  } else {
    issues.push({type: 'pass', label: `DNS lookups within limit (${lookupCount}/10)`, detail: 'Your SPF record uses an acceptable number of DNS lookups.'});
  }

  const ptrMechs = mechanisms.filter(m => m.type === 'ptr');
  if (ptrMechs.length > 0) {
    issues.push({type: 'warning', label: 'ptr mechanism is deprecated', detail: 'The ptr mechanism is slow and unreliable. RFC 7208 recommends avoiding it. Use ip4/ip6 or include instead.'});
  }

  const grade = issues.some(i => i.type === 'error') ? 'fail' : issues.some(i => i.type === 'warning') ? 'warning' : 'pass';

  return {mechanisms, allMechanism, issues, lookupCount, grade};
}

function qualifierLabel(q: string) {
  if (q === '+') return {label: 'PASS', cls: 'bg-ok-surface text-ok border-ok/25'};
  if (q === '-') return {label: 'FAIL', cls: 'bg-err-surface text-err border-err/25'};
  if (q === '~') return {label: 'SOFTFAIL', cls: 'bg-warn-surface text-warn border-warn/25'};
  return {label: 'NEUTRAL', cls: 'bg-neutral-100 text-neutral-600 border-neutral-300'};
}

function GradeBadge({grade}: {grade: 'pass' | 'warning' | 'fail'}) {
  const map = {
    pass: {cls: 'bg-ok-surface border-ok/25 text-ok', label: 'Valid', sub: 'SPF is properly configured'},
    warning: {cls: 'bg-warn-surface border-warn/25 text-warn', label: 'Needs attention', sub: 'SPF has configuration issues'},
    fail: {cls: 'bg-err-surface border-err/25 text-err', label: 'Action required', sub: 'SPF has critical errors'},
  };
  const {cls, label, sub} = map[grade];
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-8 py-5 ${cls}`}>
      <span style={{fontFamily: 'var(--font-display)'}} className={'text-2xl font-extrabold'}>{label}</span>
      <span className={'text-xs font-medium opacity-80'}>{sub}</span>
    </div>
  );
}

const faqs: FAQ[] = [
  {
    question: 'What is an SPF record?',
    answer: 'An SPF (Sender Policy Framework) record is a DNS TXT record that lists the mail servers authorised to send email on behalf of your domain. Receiving mail servers check this record to verify that incoming email claiming to be from your domain was sent by an authorised server. Without SPF, anyone can spoof your domain in the From address.',
  },
  {
    question: 'What does -all vs ~all mean?',
    answer: '-all (hard fail) instructs receiving servers to reject any email not matching your SPF record. ~all (softfail) marks non-matching emails as suspicious but still delivers them. For production domains, -all is recommended once all your legitimate sending sources are added.',
  },
  {
    question: 'Why is there a 10 DNS lookup limit?',
    answer: 'RFC 7208 limits SPF to 10 DNS lookups to prevent denial-of-service attacks and excessive DNS load. Each include, a, mx, ptr, and exists mechanism counts as one lookup. Exceeding 10 lookups causes a PermError, which effectively makes SPF fail for your domain.',
  },
  {
    question: 'Can I have multiple SPF records?',
    answer: 'No. Having more than one SPF (v=spf1) TXT record on your domain causes a PermError and breaks SPF authentication. If you need to authorise multiple senders, combine everything into a single SPF record using multiple mechanisms.',
  },
  {
    question: 'Does SPF alone protect against spoofing?',
    answer: 'SPF alone is not enough. SPF only validates the envelope sender (the "Return-Path" address), not the visible "From" header. DMARC is required to connect SPF (and DKIM) validation to the From header and actually prevent spoofing of your visible sender address.',
  },
];

interface DnsAnswer {
  data: string;
}

interface SpfLookupResult {
  domain: string;
  found: boolean;
  multiple: boolean;
  records: string[];
  error?: string;
}

function cleanTxt(raw: string): string {
  return raw.replace(/^"|"$/g, '').replace(/"\s*"/g, '');
}

async function lookupSpf(domain: string): Promise<SpfLookupResult> {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(clean)}&type=TXT`, {
      headers: {Accept: 'application/dns-json'},
    });
    if (!res.ok) return {domain: clean, found: false, multiple: false, records: [], error: 'DNS lookup failed'};
    const data = await res.json() as {Answer?: DnsAnswer[]};
    const records = (data.Answer ?? []).map((a: DnsAnswer) => cleanTxt(a.data)).filter(r => r.startsWith('v=spf1'));
    return {domain: clean, found: records.length > 0, multiple: records.length > 1, records};
  } catch {
    return {domain: clean, found: false, multiple: false, records: [], error: 'DNS lookup failed'};
  }
}

export default function SpfCheckerPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpfLookupResult | null>(null);
  const [parsed, setParsed] = useState<ParsedSpf | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setParsed(null);

    try {
      const data = await lookupSpf(domain);
      setResult(data);
      if (data.found && data.records[0]) {
        setParsed(parseSpfRecord(data.records[0]));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NextSeo
        title="SPF Record Checker | Free SPF Lookup & Validator | Plunk"
        description="Free SPF record checker. Look up and validate your domain's SPF record, check for misconfigurations, and get actionable advice to improve email deliverability."
        canonical="https://www.useplunk.com/tools/spf-checker"
        openGraph={{
          title: 'SPF Record Checker | Free SPF Lookup & Validator | Plunk',
          description: 'Free SPF record checker. Look up and validate your domain SPF record and get actionable deliverability advice.',
          url: 'https://www.useplunk.com/tools/spf-checker',
          images: [{url: 'https://www.useplunk.com/api/og?title=Free+SPF+Record+Checker&tag=Tool', alt: 'Plunk SPF Checker', width: 1200, height: 630}],
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
                <span className={'font-medium text-neutral-900'}>§ T-04 &nbsp;— &nbsp;Tool</span>
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
                  SPF record
                  <br />
                  checker
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Look up and validate your domain&apos;s SPF record. Get a full breakdown of your sending policy and
                  catch misconfigurations before they hurt deliverability.
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
              className={'mx-auto max-w-2xl'}
            >
              <div className={'overflow-hidden rounded-card border border-neutral-200 bg-white'}>
                <div className={'border-b border-neutral-200 px-8 py-5'}>
                  <div className={'flex items-center gap-3'}>
                    <Shield className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      SPF record lookup
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCheck} className={'p-8'}>
                  <div className={'space-y-4'}>
                    <div>
                      <label htmlFor="domain" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                        Domain name <span className={'text-err'}>*</span>
                      </label>
                      <Input
                        id="domain"
                        type="text"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        placeholder="example.com"
                        required
                        className={'w-full'}
                      />
                      <p className={'mt-1.5 text-xs text-neutral-500'}>Enter the domain without http:// or www.</p>
                    </div>
                    <Button type="submit" className={'w-full gap-2'} disabled={loading}>
                      <Shield className={'h-4 w-4'} />
                      {loading ? 'Looking up SPF record…' : 'Check SPF record'}
                    </Button>
                  </div>
                </form>
              </div>

              {result && (
                <motion.div
                  initial={{opacity: 0, y: 16}}
                  animate={{opacity: 1, y: 0}}
                  transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                  className={'mt-6 space-y-4'}
                >
                  {!result.found ? (
                    <div className={'rounded-card border border-err/25 bg-err-surface p-8'}>
                      <div className={'flex items-start gap-3'}>
                        <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-err'} />
                        <div>
                          <p className={'font-semibold text-err'}>No SPF record found</p>
                          <p className={'mt-1 text-ui text-err'}>
                            {result.error
                              ? 'DNS lookup failed. Please check the domain and try again.'
                              : `No SPF record was found for ${result.domain}. Without SPF, anyone can send email impersonating your domain, and legitimate emails are more likely to land in spam.`}
                          </p>
                          <p className={'mt-3 text-ui font-medium text-err'}>
                            Add a TXT record to <span style={{fontFamily: 'var(--font-mono)'}}>{result.domain}</span>:
                          </p>
                          <code
                            style={{fontFamily: 'var(--font-mono)'}}
                            className={'mt-2 block rounded-lg bg-err-surface px-4 py-3 text-xs text-err'}
                          >
                            v=spf1 include:your-email-provider.com -all
                          </code>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {result.multiple && (
                        <div className={'rounded-card border border-err/25 bg-err-surface p-6'}>
                          <div className={'flex items-start gap-3'}>
                            <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-err'} />
                            <div>
                              <p className={'font-semibold text-err'}>Multiple SPF records detected</p>
                              <p className={'mt-1 text-ui text-err'}>
                                Having more than one SPF record causes a PermError, breaking SPF for your domain. Merge all mechanisms into a single v=spf1 record.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Raw record */}
                      <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                        <p
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'mb-2 text-label text-neutral-500'}
                        >
                          Raw record — {result.domain}
                        </p>
                        <code
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'block break-all rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-700'}
                        >
                          {result.records[0]}
                        </code>
                      </div>

                      {parsed && (
                        <>
                          {/* Grade */}
                          <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                            <div className={'flex flex-col items-center gap-4 text-center'}>
                              <GradeBadge grade={parsed.grade} />
                            </div>
                          </div>

                          {/* Mechanisms */}
                          <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                            <h3
                              style={{fontFamily: 'var(--font-display)'}}
                              className={'mb-6 text-lg font-bold text-neutral-900'}
                            >
                              Sending mechanisms
                            </h3>
                            <div className={'space-y-2'}>
                              {parsed.mechanisms.map((m, i) => {
                                const {label, cls} = qualifierLabel(m.qualifier);
                                return (
                                  <div key={i} className={'flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>
                                      {label}
                                    </span>
                                    <span style={{fontFamily: 'var(--font-mono)'}} className={'text-xs font-medium text-neutral-700'}>
                                      {m.type}
                                    </span>
                                    {m.value && (
                                      <span style={{fontFamily: 'var(--font-mono)'}} className={'truncate text-xs text-neutral-500'}>
                                        {m.value}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              {parsed.allMechanism && (
                                <div className={'flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-3'}>
                                  <span
                                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${qualifierLabel(parsed.allMechanism[0] ?? '+').cls}`}
                                  >
                                    {qualifierLabel(parsed.allMechanism[0] ?? '+').label}
                                  </span>
                                  <span style={{fontFamily: 'var(--font-mono)'}} className={'text-xs font-semibold text-neutral-700'}>
                                    all
                                  </span>
                                  <span className={'text-xs text-neutral-500'}>— default for all other senders</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Issues */}
                          <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                            <h3
                              style={{fontFamily: 'var(--font-display)'}}
                              className={'mb-6 text-lg font-bold text-neutral-900'}
                            >
                              Analysis &amp; recommendations
                            </h3>
                            <ul className={'space-y-3'}>
                              {parsed.issues.map((issue, i) => (
                                <li key={i} className={'flex items-start gap-3'}>
                                  {issue.type === 'pass' ? (
                                    <CheckCircle className={'mt-0.5 h-5 w-5 shrink-0 text-ok'} />
                                  ) : issue.type === 'warning' ? (
                                    <AlertTriangle className={'mt-0.5 h-5 w-5 shrink-0 text-warn'} />
                                  ) : (
                                    <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-err'} />
                                  )}
                                  <div>
                                    <p className={'text-ui font-medium text-neutral-900'}>{issue.label}</p>
                                    <p className={'mt-0.5 text-xs text-neutral-500'}>{issue.detail}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>
          </section>

          {/* ========== EDUCATION ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'How SPF protects your domain.'}
                subtitle={'SPF is the first line of defence against email spoofing and phishing.'}
              />

              <div className={'mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
                {[
                  {
                    title: 'Authorise senders',
                    body: 'SPF lets you publish a list of mail servers allowed to send on your behalf. Any server not on the list fails SPF validation.',
                  },
                  {
                    title: 'Prevent spoofing',
                    body: 'Without SPF, anyone can claim to send email from your domain. SPF makes it possible for receiving servers to detect and reject spoofed messages.',
                  },
                  {
                    title: '10 lookup limit',
                    body: 'SPF allows at most 10 DNS lookups per evaluation. Exceeding this causes a PermError, making SPF permanently fail. Monitor your lookup count carefully.',
                  },
                  {
                    title: 'SPF is not enough alone',
                    body: 'SPF validates the envelope sender, not the visible From header. You need DMARC to tie SPF (and DKIM) results to the From header and actually block spoofed email.',
                  },
                  {
                    title: 'One record only',
                    body: 'A domain must have exactly one SPF TXT record. Multiple v=spf1 records cause a PermError. Merge all sending sources into a single record.',
                  },
                  {
                    title: 'Hard fail vs softfail',
                    body: '-all (hard fail) instructs servers to reject non-matching mail. ~all (softfail) marks it as suspicious. Use -all in production once all senders are listed.',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1]}}
                    className={'flex flex-col gap-4 rounded-card border border-neutral-200 bg-white p-8'}
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
                  SPF, DKIM, and DMARC — handled.
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Plunk guides you through domain authentication setup and monitors your sending reputation.
                    Start free, no credit card required.
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
                      href="/guides/what-is-spf"
                      className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}
                    >
                      What is SPF?
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <FAQSection faqs={faqs} schemaId="faq-spf-checker" />
      <Footer />
    </>
  );
}
