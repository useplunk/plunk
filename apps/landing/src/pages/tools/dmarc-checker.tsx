import {FAQSection, Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {AlertTriangle, ArrowRight, CheckCircle, ShieldCheck, XCircle} from 'lucide-react';
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

interface DmarcIssue {
  type: 'error' | 'warning' | 'pass';
  label: string;
  detail: string;
}

interface DmarcAnalysis {
  policy: string;
  subPolicy: string | null;
  pct: number;
  hasRua: boolean;
  hasRuf: boolean;
  adkim: string;
  aspf: string;
  issues: DmarcIssue[];
  grade: 'pass' | 'warning' | 'fail';
}

function analyzeDmarc(tags: Record<string, string>): DmarcAnalysis {
  const policy = tags['p'] ?? '';
  const subPolicy = tags['sp'] ?? null;
  const pct = parseInt(tags['pct'] ?? '100', 10);
  const hasRua = Boolean(tags['rua']);
  const hasRuf = Boolean(tags['ruf']);
  const adkim = tags['adkim'] ?? 'r';
  const aspf = tags['aspf'] ?? 'r';
  const issues: DmarcIssue[] = [];

  // Policy
  if (!policy) {
    issues.push({type: 'error', label: 'Missing policy (p=)', detail: 'The p= tag is required. Set p=none to monitor, p=quarantine to send to spam, or p=reject to block.'});
  } else if (policy === 'none') {
    issues.push({type: 'warning', label: 'Policy is p=none (monitoring only)', detail: 'p=none means DMARC failures are reported but no action is taken. Upgrade to p=quarantine then p=reject once you confirm legitimate mail passes.'});
  } else if (policy === 'quarantine') {
    issues.push({type: 'warning', label: 'Policy is p=quarantine', detail: 'Failing messages are sent to spam/junk. Consider upgrading to p=reject for full protection.'});
  } else if (policy === 'reject') {
    issues.push({type: 'pass', label: 'Policy is p=reject — maximum protection', detail: 'Failing messages are rejected outright. This is the strongest DMARC policy.'});
  }

  // Percentage
  if (pct < 100) {
    issues.push({type: 'warning', label: `Policy applies to only ${pct}% of messages`, detail: `pct=${pct} means DMARC enforcement only applies to ${pct}% of failing mail. Set pct=100 for full enforcement.`});
  } else if (policy && policy !== 'none') {
    issues.push({type: 'pass', label: 'Policy applies to 100% of messages', detail: 'DMARC enforcement is fully deployed.'});
  }

  // Aggregate reports
  if (!hasRua) {
    issues.push({type: 'warning', label: 'No aggregate reporting (rua= missing)', detail: 'Without rua=, you receive no DMARC aggregate reports. Add rua=mailto:dmarc@yourdomain.com or use a DMARC reporting service to monitor your authentication results.'});
  } else {
    issues.push({type: 'pass', label: 'Aggregate reports configured (rua=)', detail: 'You will receive DMARC aggregate reports to monitor SPF and DKIM alignment.'});
  }

  // Alignment
  if (adkim === 's') {
    issues.push({type: 'pass', label: 'DKIM alignment: strict', detail: 'Strict DKIM alignment requires the d= domain in the DKIM signature to exactly match the From domain.'});
  }
  if (aspf === 's') {
    issues.push({type: 'pass', label: 'SPF alignment: strict', detail: 'Strict SPF alignment requires the envelope sender domain to exactly match the From domain.'});
  }

  const grade = issues.some(i => i.type === 'error') ? 'fail' : issues.some(i => i.type === 'warning') ? 'warning' : 'pass';

  return {policy, subPolicy, pct, hasRua, hasRuf, adkim, aspf, issues, grade};
}

function PolicyBadge({policy}: {policy: string}) {
  if (policy === 'reject') {
    return <span className={'rounded-full bg-ok-surface px-3 py-1 text-xs font-bold text-ok border border-ok/25'}>reject</span>;
  }
  if (policy === 'quarantine') {
    return <span className={'rounded-full bg-warn-surface px-3 py-1 text-xs font-bold text-warn border border-warn/25'}>quarantine</span>;
  }
  if (policy === 'none') {
    return <span className={'rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600 border border-neutral-300'}>none</span>;
  }
  return <span className={'rounded-full bg-err-surface px-3 py-1 text-xs font-bold text-err border border-err/25'}>missing</span>;
}

function GradeBadge({grade, policy}: {grade: 'pass' | 'warning' | 'fail'; policy: string}) {
  const map = {
    pass: {cls: 'bg-ok-surface border-ok/25 text-ok', label: 'Valid'},
    warning: {cls: 'bg-warn-surface border-warn/25 text-warn', label: 'Needs attention'},
    fail: {cls: 'bg-err-surface border-err/25 text-err', label: 'Action required'},
  };
  const {cls, label} = map[grade];
  const sub = policy === 'reject' ? 'Full DMARC protection' : policy === 'quarantine' ? 'Partial protection' : policy === 'none' ? 'Monitoring only — no enforcement' : 'DMARC not enforcing';
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-8 py-5 ${cls}`}>
      <span style={{fontFamily: 'var(--font-display)'}} className={'text-2xl font-extrabold'}>{label}</span>
      <span className={'text-xs font-medium opacity-80'}>{sub}</span>
    </div>
  );
}

const TAG_DESCRIPTIONS: Record<string, string> = {
  v: 'DMARC version',
  p: 'Domain policy for failing messages',
  sp: 'Subdomain policy override',
  pct: 'Percentage of messages subject to policy',
  rua: 'Aggregate report recipients',
  ruf: 'Forensic report recipients',
  adkim: 'DKIM alignment mode (r=relaxed, s=strict)',
  aspf: 'SPF alignment mode (r=relaxed, s=strict)',
  fo: 'Failure reporting options',
  rf: 'Forensic report format',
  ri: 'Reporting interval (seconds)',
};

const faqs: FAQ[] = [
  {
    question: 'What is DMARC?',
    answer: 'DMARC (Domain-based Message Authentication, Reporting & Conformance) is an email authentication policy that builds on SPF and DKIM. It tells receiving mail servers what to do when an email fails authentication — none (monitor), quarantine (spam folder), or reject (block). DMARC also enables reporting so you can see who is sending email from your domain.',
  },
  {
    question: 'What is the difference between p=none, quarantine, and reject?',
    answer: 'p=none means DMARC is in monitoring mode — failures are reported but emails are still delivered. p=quarantine instructs receiving servers to put failing messages in the spam/junk folder. p=reject instructs servers to reject failing messages entirely. The recommended path is to start at p=none, review reports, then progress to quarantine and finally reject.',
  },
  {
    question: 'What are DMARC aggregate reports?',
    answer: 'Aggregate reports (rua=) are XML reports sent by receiving mail servers summarising how many messages passed or failed SPF and DKIM for your domain. They help you identify all sources sending on your behalf, catch misconfigurations, and detect spoofing attempts. Use a DMARC reporting service to parse and visualise these reports.',
  },
  {
    question: 'Why do I need DMARC if I already have SPF and DKIM?',
    answer: 'SPF and DKIM independently authenticate different aspects of an email, but neither specifies what to do when authentication fails. DMARC ties them together and enforces a policy. Without DMARC, even a domain with perfect SPF and DKIM offers no protection against spoofing of the visible From header.',
  },
  {
    question: 'What is DMARC alignment?',
    answer: 'DMARC alignment requires that the domain in a passing SPF or DKIM check matches (or aligns with) the From header domain. Relaxed alignment (r) allows subdomains; strict alignment (s) requires an exact domain match. Alignment is what connects SPF/DKIM to the From header the user sees.',
  },
];

interface DnsAnswer {
  data: string;
}

interface DmarcLookupResult {
  domain: string;
  found: boolean;
  record: string | null;
  tags: Record<string, string>;
  error?: string;
}

function cleanTxt(raw: string): string {
  return raw.replace(/^"|"$/g, '').replace(/"\s*"/g, '');
}

async function lookupDmarc(domain: string): Promise<DmarcLookupResult> {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(`_dmarc.${clean}`)}&type=TXT`, {
      headers: {Accept: 'application/dns-json'},
    });
    if (!res.ok) return {domain: clean, found: false, record: null, tags: {}, error: 'DNS lookup failed'};
    const data = await res.json() as {Answer?: DnsAnswer[]};
    const records = (data.Answer ?? []).map((a: DnsAnswer) => cleanTxt(a.data)).filter(r => r.startsWith('v=DMARC1'));
    if (records.length === 0) return {domain: clean, found: false, record: null, tags: {}};
    const record: string = records[0]!;
    const tags: Record<string, string> = {};
    record.split(';').forEach(part => {
      const eqIdx = part.indexOf('=');
      if (eqIdx > -1) {
        const key = part.slice(0, eqIdx).trim();
        const value = part.slice(eqIdx + 1).trim();
        if (key) tags[key] = value;
      }
    });
    return {domain: clean, found: true, record, tags};
  } catch {
    return {domain: clean, found: false, record: null, tags: {}, error: 'DNS lookup failed'};
  }
}

export default function DmarcCheckerPage() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DmarcLookupResult | null>(null);
  const [analysis, setAnalysis] = useState<DmarcAnalysis | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setAnalysis(null);

    try {
      const data = await lookupDmarc(domain);
      setResult(data);
      if (data.found && data.tags) {
        setAnalysis(analyzeDmarc(data.tags));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NextSeo
        title="DMARC Record Checker | Free DMARC Lookup & Validator | Plunk"
        description="Free DMARC record checker. Look up and validate your domain's DMARC policy, check reporting configuration, and get step-by-step advice to strengthen email security."
        canonical="https://www.useplunk.com/tools/dmarc-checker"
        openGraph={{
          title: 'DMARC Record Checker | Free DMARC Lookup & Validator | Plunk',
          description: 'Free DMARC record checker. Validate your DMARC policy and get actionable advice to protect your domain from spoofing.',
          url: 'https://www.useplunk.com/tools/dmarc-checker',
          images: [{url: 'https://www.useplunk.com/api/og?title=Free+DMARC+Record+Checker&tag=Tool', alt: 'Plunk DMARC Checker', width: 1200, height: 630}],
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
                <span className={'font-medium text-neutral-900'}>§ T-05 &nbsp;— &nbsp;Tool</span>
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
                  DMARC record
                  <br />
                  checker
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Look up and validate your domain&apos;s DMARC record. Understand your current policy, reporting
                  configuration, and get clear advice to progress toward full enforcement.
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
                    <ShieldCheck className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      DMARC record lookup
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
                      <ShieldCheck className={'h-4 w-4'} />
                      {loading ? 'Looking up DMARC record…' : 'Check DMARC record'}
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
                          <p className={'font-semibold text-err'}>No DMARC record found</p>
                          <p className={'mt-1 text-ui text-err'}>
                            {result.error
                              ? 'DNS lookup failed. Please check the domain and try again.'
                              : `No DMARC record was found at _dmarc.${result.domain}. Without DMARC, your domain has no enforcement policy and you won't receive authentication reports.`}
                          </p>
                          <p className={'mt-3 text-ui font-medium text-err'}>
                            Add a TXT record to <span style={{fontFamily: 'var(--font-mono)'}}>_dmarc.{result.domain}</span>:
                          </p>
                          <code
                            style={{fontFamily: 'var(--font-mono)'}}
                            className={'mt-2 block rounded-lg bg-err-surface px-4 py-3 text-xs text-err break-all'}
                          >
                            {`v=DMARC1; p=none; rua=mailto:dmarc@${result.domain}`}
                          </code>
                          <p className={'mt-2 text-xs text-err'}>Start with p=none to monitor, then progress to quarantine and reject.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Raw record */}
                      <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                        <p
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'mb-2 text-label text-neutral-500'}
                        >
                          Raw record — _dmarc.{result.domain}
                        </p>
                        <code
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'block break-all rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-700'}
                        >
                          {result.record}
                        </code>
                      </div>

                      {analysis && (
                        <>
                          {/* Grade */}
                          <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                            <div className={'flex flex-col items-center gap-4 text-center'}>
                              <GradeBadge grade={analysis.grade} policy={analysis.policy} />
                            </div>
                          </div>

                          {/* Tags */}
                          <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                            <h3
                              style={{fontFamily: 'var(--font-display)'}}
                              className={'mb-6 text-lg font-bold text-neutral-900'}
                            >
                              Record tags
                            </h3>
                            <div className={'space-y-2'}>
                              {Object.entries(result.tags).map(([key, value]) => (
                                <div key={key} className={'flex items-start gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                                  <div className={'flex min-w-0 flex-1 items-center gap-3'}>
                                    <span style={{fontFamily: 'var(--font-mono)'}} className={'shrink-0 text-xs font-bold text-neutral-700'}>
                                      {key}=
                                    </span>
                                    {key === 'p' || key === 'sp' ? (
                                      <PolicyBadge policy={value} />
                                    ) : (
                                      <span style={{fontFamily: 'var(--font-mono)'}} className={'truncate text-xs text-neutral-500'}>
                                        {value}
                                      </span>
                                    )}
                                  </div>
                                  {TAG_DESCRIPTIONS[key] && (
                                    <span className={'shrink-0 text-xs text-neutral-500'}>{TAG_DESCRIPTIONS[key]}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Analysis */}
                          <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                            <h3
                              style={{fontFamily: 'var(--font-display)'}}
                              className={'mb-6 text-lg font-bold text-neutral-900'}
                            >
                              Analysis &amp; recommendations
                            </h3>
                            <ul className={'space-y-3'}>
                              {analysis.issues.map((issue, i) => (
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
                title={'From monitoring to full enforcement.'}
                subtitle={'DMARC is a journey. Start with none, build confidence, then enforce.'}
              />

              <div className={'mt-20 grid gap-6 sm:grid-cols-3'}>
                {[
                  {
                    step: '01',
                    policy: 'p=none',
                    title: 'Monitor',
                    body: 'Start here. DMARC is active but no action is taken on failures. Add rua= to receive aggregate reports and identify all your sending sources.',
                    cls: 'border-neutral-300',
                  },
                  {
                    step: '02',
                    policy: 'p=quarantine',
                    title: 'Quarantine',
                    body: 'Once you\'re confident all legitimate senders pass, move to quarantine. Failing messages are sent to spam, reducing spoofing impact.',
                    cls: 'border-warn/25',
                  },
                  {
                    step: '03',
                    policy: 'p=reject',
                    title: 'Reject',
                    body: 'Full enforcement. Failing messages are rejected by receiving servers. This is the goal — it completely prevents domain spoofing.',
                    cls: 'border-ok/25',
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
                    <div className={'flex items-center justify-between'}>
                      <span
                        style={{fontFamily: 'var(--font-mono)'}}
                        className={'text-label text-neutral-500'}
                      >
                        Step {item.step}
                      </span>
                      <code
                        style={{fontFamily: 'var(--font-mono)'}}
                        className={'rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700'}
                      >
                        {item.policy}
                      </code>
                    </div>
                    <h3
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-2xl font-bold tracking-[-0.02em] text-neutral-900'}
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
                    Plunk walks you through SPF, DKIM, and DMARC setup and monitors your sending reputation over time.
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
                      href="/guides/what-is-dmarc"
                      className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}
                    >
                      What is DMARC?
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <FAQSection faqs={faqs} schemaId="faq-dmarc-checker" />
      <Footer />
    </>
  );
}
