import {FAQSection, Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {AlertTriangle, ArrowRight, CheckCircle, Mail, XCircle} from 'lucide-react';
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

interface MxRecord {
  priority: number;
  exchange: string;
}

interface MxLookupResult {
  domain: string;
  found: boolean;
  records: MxRecord[];
  issues: MxIssue[];
  error?: string;
}

interface MxIssue {
  type: 'error' | 'warning' | 'pass';
  label: string;
  detail: string;
}

interface DnsAnswer {
  data: string;
}

function parseMxData(data: string): MxRecord {
  const parts = data.trim().split(/\s+/);
  const priority = parseInt(parts[0] ?? '0', 10);
  const exchange = (parts[1] ?? '').replace(/\.$/, '');
  return {priority, exchange};
}

function analyzeMx(records: MxRecord[]): MxIssue[] {
  const issues: MxIssue[] = [];

  if (records.length === 0) {
    issues.push({type: 'error', label: 'No MX records found', detail: 'Without MX records, mail servers cannot deliver email to this domain. Add at least one MX record pointing to your mail server.'});
    return issues;
  }

  issues.push({type: 'pass', label: `${records.length} MX record${records.length > 1 ? 's' : ''} found`, detail: 'Mail servers can look up where to deliver email for this domain.'});

  if (records.length === 1) {
    issues.push({type: 'warning', label: 'Single MX record — no redundancy', detail: 'If this mail server is unavailable, email delivery will fail. Consider adding a secondary MX record with a higher priority number as a fallback.'});
  } else {
    issues.push({type: 'pass', label: 'Multiple MX records — redundancy configured', detail: 'If the primary server is unreachable, mail will fall back to lower-priority servers.'});
  }

  const priorities = records.map(r => r.priority);
  const uniquePriorities = new Set(priorities);
  if (uniquePriorities.size < priorities.length) {
    issues.push({type: 'warning', label: 'Duplicate priority values', detail: 'Two or more MX records share the same priority. When priorities are equal, senders choose randomly between them. This may be intentional for load balancing, but verify it matches your setup.'});
  }

  const hasMxPointingToIp = records.some(r => /^\d+\.\d+\.\d+\.\d+$/.test(r.exchange));
  if (hasMxPointingToIp) {
    issues.push({type: 'error', label: 'MX record points to an IP address', detail: 'MX records must point to a hostname, not an IP address. This is an RFC 5321 violation and many mail servers will reject mail. Change the MX value to a fully qualified domain name.'});
  }

  const hasTrailingDot = records.some(r => r.exchange.endsWith('.'));
  if (!hasTrailingDot && records.some(r => r.exchange.includes('.'))) {
    issues.push({type: 'pass', label: 'MX hostnames look well-formed', detail: 'All exchange hostnames appear to be valid fully qualified domain names.'});
  }

  return issues;
}

async function lookupMx(domain: string): Promise<MxLookupResult> {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(clean)}&type=MX`,
      {headers: {Accept: 'application/dns-json'}},
    );
    if (!res.ok) return {domain: clean, found: false, records: [], issues: [], error: 'DNS lookup failed'};
    const data = await res.json() as {Status: number; Answer?: DnsAnswer[]};
    if (data.Status !== 0 || !Array.isArray(data.Answer) || data.Answer.length === 0) {
      const issues = analyzeMx([]);
      return {domain: clean, found: false, records: [], issues};
    }
    const records: MxRecord[] = data.Answer.map((a: DnsAnswer) => parseMxData(a.data)).sort((a, b) => a.priority - b.priority);
    const issues = analyzeMx(records);
    return {domain: clean, found: true, records, issues};
  } catch {
    return {domain: clean, found: false, records: [], issues: [], error: 'DNS lookup failed'};
  }
}

function priorityLabel(priority: number): string {
  if (priority === 0) return 'Primary';
  if (priority <= 10) return 'Primary';
  if (priority <= 20) return 'Secondary';
  return 'Fallback';
}

const faqs: FAQ[] = [
  {
    question: 'What is an MX record?',
    answer: 'An MX (Mail Exchanger) record is a DNS record that specifies which mail servers are responsible for receiving email for a domain. When someone sends an email to you@yourdomain.com, the sending mail server looks up the MX records for yourdomain.com to find where to deliver the message.',
  },
  {
    question: 'What does the MX priority number mean?',
    answer: 'The priority number (also called preference) tells senders which mail server to try first. Lower numbers = higher priority. A server with priority 10 is tried before one with priority 20. If the primary server is unavailable, senders retry with the next highest priority server. Equal priority values means senders choose randomly — this is sometimes used for load balancing.',
  },
  {
    question: 'Do I need more than one MX record?',
    answer: 'It\'s strongly recommended. A single MX record means email will bounce or queue during any outage. Adding a secondary MX (typically your mail provider\'s backup server, or a service like Google MX backup) ensures email is accepted even if your primary server is temporarily down.',
  },
  {
    question: 'Why would email delivery fail even if MX records are correct?',
    answer: 'Several reasons: the mail server the MX points to may be down or unreachable on port 25; your IP or domain may be on a blacklist; SPF, DKIM, or DMARC might be misconfigured causing rejection; or the receiving server may be filtering based on content. MX records are just the first step — authentication records and reputation matter too.',
  },
  {
    question: 'Can I change my MX records without losing email?',
    answer: 'Yes, with care. Lower your TTL to 300 seconds a day before making changes so the change propagates quickly. Add the new MX records before removing the old ones. Wait for propagation (typically 5–30 minutes with a low TTL), confirm the new server is receiving, then remove the old records and restore your TTL.',
  },
];

export default function MxCheckerPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MxLookupResult | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await lookupMx(domain);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NextSeo
        title="MX Record Checker | Free MX Lookup Tool | Plunk"
        description="Free MX record checker. Look up the mail exchange records for any domain, see server priority, and diagnose email delivery problems. No sign-up required."
        canonical="https://www.useplunk.com/tools/mx-checker"
        openGraph={{
          title: 'MX Record Checker | Free MX Lookup Tool | Plunk',
          description: 'Look up MX records for any domain. Check mail server priority, redundancy, and diagnose delivery problems. Free, no sign-up.',
          url: 'https://www.useplunk.com/tools/mx-checker',
          images: [{url: 'https://www.useplunk.com/api/og?title=MX+Record+Checker&tag=Tool', alt: 'Plunk MX Checker', width: 1200, height: 630}],
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
                <span className={'font-medium text-neutral-900'}>§ T-08 &nbsp;— &nbsp;Tool</span>
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
                  MX record
                  <br />
                  checker
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Look up the mail exchange records for any domain. See mail server priority, check for redundancy, and diagnose email delivery problems.
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
                    <Mail className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>
                      MX record lookup
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCheck} className={'p-8'}>
                  <div className={'space-y-4'}>
                    <div>
                      <label htmlFor="mxDomain" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                        Domain name <span className={'text-err'}>*</span>
                      </label>
                      <Input
                        id="mxDomain"
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
                      <Mail className={'h-4 w-4'} />
                      {loading ? 'Looking up MX records…' : 'Check MX records'}
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
                  {result.error ? (
                    <div className={'rounded-card border border-err/25 bg-err-surface p-8'}>
                      <div className={'flex items-start gap-3'}>
                        <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-err'} />
                        <div>
                          <p className={'font-semibold text-err'}>DNS lookup failed</p>
                          <p className={'mt-1 text-ui text-err'}>Could not query MX records for {result.domain}. Check the domain name and try again.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!result.found || result.records.length === 0 ? (
                        <div className={'rounded-card border border-err/25 bg-err-surface p-8'}>
                          <div className={'flex items-start gap-3'}>
                            <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-err'} />
                            <div>
                              <p className={'font-semibold text-err'}>No MX records found</p>
                              <p className={'mt-1 text-ui text-err'}>
                                {result.domain} has no MX records. Email cannot be delivered to this domain. Add at least one MX record in your DNS provider.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                          <h3 style={{fontFamily: 'var(--font-display)'}} className={'mb-6 text-lg font-bold text-neutral-900'}>
                            MX records for {result.domain}
                          </h3>
                          <div className={'space-y-3'}>
                            {result.records.map((rec, i) => (
                              <div key={i} className={'flex items-center gap-4 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                                <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white'}>
                                  <span style={{fontFamily: 'var(--font-mono)'}} className={'text-xs font-bold tabular-nums text-neutral-700'}>
                                    {rec.priority}
                                  </span>
                                </div>
                                <div className={'min-w-0 flex-1'}>
                                  <span style={{fontFamily: 'var(--font-mono)'}} className={'block truncate text-ui font-medium text-neutral-900'}>
                                    {rec.exchange || '(empty)'}
                                  </span>
                                  <span className={'text-xs text-neutral-500'}>Priority {rec.priority} · {priorityLabel(rec.priority)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.issues.length > 0 && (
                        <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                          <h3 style={{fontFamily: 'var(--font-display)'}} className={'mb-6 text-lg font-bold text-neutral-900'}>
                            Analysis
                          </h3>
                          <ul className={'space-y-3'}>
                            {result.issues.map((issue, i) => (
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
                title={'How email finds its destination.'}
                subtitle={'MX records are the address book of email routing — without them, no one can send you mail.'}
              />

              <div className={'mt-20 grid gap-6 sm:grid-cols-3'}>
                {[
                  {
                    step: '01',
                    title: 'Sender looks up MX',
                    body: 'When someone sends to you@domain.com, their mail server queries DNS for the MX records of domain.com. The priority numbers tell it which server to try first.',
                    cls: 'border-neutral-300',
                  },
                  {
                    step: '02',
                    title: 'Connection to port 25',
                    body: 'The sending server opens an SMTP connection to port 25 on your mail server\'s hostname. If the connection fails, it tries the next MX in priority order.',
                    cls: 'border-neutral-300',
                  },
                  {
                    step: '03',
                    title: 'Authentication checks',
                    body: 'Your mail server runs SPF, DKIM, and DMARC checks on the incoming message. Failures may cause the message to be filtered or rejected depending on your policy.',
                    cls: 'border-neutral-300',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.step}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1]}}
                    className={`flex flex-col gap-5 rounded-card border-2 bg-white p-8 ${item.cls}`}
                  >
                    <span style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>
                      Step {item.step}
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
                  Email that reaches the inbox.
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Plunk handles SPF, DKIM, and DMARC setup and keeps your sending reputation clean so email lands in the inbox.
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
                      href="/tools/spf-checker"
                      className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}
                    >
                      Check SPF record
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <FAQSection faqs={faqs} schemaId="faq-mx-checker" />
      <Footer />
    </>
  );
}
