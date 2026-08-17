import {FAQSection, Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {AlertTriangle, ArrowRight, CheckCircle, Key, XCircle} from 'lucide-react';
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

const COMMON_SELECTORS = [
  {label: 'Google Workspace', value: 'google'},
  {label: 'Microsoft 365', value: 'selector1'},
  {label: 'Microsoft 365 (2)', value: 'selector2'},
  {label: 'Mailchimp', value: 'k1'},
  {label: 'Mailchimp (2)', value: 'k2'},
  {label: 'Postmark', value: 'pm'},
  {label: 'SendGrid', value: 'sendgrid'},
  {label: 'Amazon SES', value: 'ses'},
  {label: 'Mailjet', value: 'mailjet'},
  {label: 'Zoho', value: 'zoho'},
  {label: 'Generic', value: 'mail'},
  {label: 'Generic (2)', value: 'default'},
  {label: 'Generic (3)', value: 's1'},
  {label: 'Generic (4)', value: 's2'},
];

interface DkimIssue {
  type: 'error' | 'warning' | 'pass';
  label: string;
  detail: string;
}

interface DkimAnalysis {
  keyType: string;
  isRevoked: boolean;
  isTesting: boolean;
  publicKeySnippet: string;
  issues: DkimIssue[];
  grade: 'pass' | 'warning' | 'fail';
}

function analyzeDkim(tags: Record<string, string>): DkimAnalysis {
  const keyType = tags['k'] ?? 'rsa';
  const publicKey = tags['p'] ?? '';
  const flags = tags['t'] ?? '';
  const isRevoked = publicKey === '';
  const isTesting = flags.includes('y');
  const issues: DkimIssue[] = [];

  if (isRevoked) {
    issues.push({type: 'error', label: 'DKIM key has been revoked', detail: 'p= is empty, which signals that this key has been intentionally revoked. Email signed with this selector will fail DKIM validation. Publish a new key.'});
  } else {
    issues.push({type: 'pass', label: 'Public key is present', detail: 'A valid public key is published for this selector.'});
  }

  if (isTesting) {
    issues.push({type: 'warning', label: 'Key is in testing mode (t=y)', detail: 'Testing mode means receiving servers should not reject messages that fail DKIM, even if the signature is invalid. Remove t=y to enable full enforcement.'});
  }

  if (keyType === 'rsa') {
    issues.push({type: 'pass', label: 'Key type: RSA', detail: 'RSA is the standard and widely-supported DKIM key type.'});
  } else if (keyType === 'ed25519') {
    issues.push({type: 'pass', label: 'Key type: Ed25519', detail: 'Ed25519 provides strong security with smaller key sizes. Ensure your sending infrastructure supports it, as some older servers may not.'});
  }

  const publicKeySnippet = publicKey.length > 32 ? `${publicKey.slice(0, 32)}…` : publicKey;

  const grade = issues.some(i => i.type === 'error') ? 'fail' : issues.some(i => i.type === 'warning') ? 'warning' : 'pass';

  return {keyType, isRevoked, isTesting, publicKeySnippet, issues, grade};
}

function GradeBadge({grade}: {grade: 'pass' | 'warning' | 'fail'}) {
  const map = {
    pass: {cls: 'bg-ok-surface border-ok/25 text-ok', label: 'Valid', sub: 'DKIM key is active'},
    warning: {cls: 'bg-warn-surface border-warn/25 text-warn', label: 'Needs attention', sub: 'DKIM has configuration issues'},
    fail: {cls: 'bg-err-surface border-err/25 text-err', label: 'Invalid', sub: 'DKIM key is revoked or invalid'},
  };
  const {cls, label, sub} = map[grade];
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-8 py-5 ${cls}`}>
      <span style={{fontFamily: 'var(--font-display)'}} className={'text-2xl font-extrabold'}>{label}</span>
      <span className={'text-xs font-medium opacity-80'}>{sub}</span>
    </div>
  );
}

const TAG_DESCRIPTIONS: Record<string, string> = {
  v: 'DKIM version',
  k: 'Key type (rsa or ed25519)',
  p: 'Base64-encoded public key',
  t: 'Flags (y=testing, s=strict service)',
  s: 'Service type restriction',
  h: 'Acceptable hash algorithms',
  n: 'Notes (human-readable)',
};

const faqs: FAQ[] = [
  {
    question: 'What is DKIM?',
    answer: 'DKIM (DomainKeys Identified Mail) is an email authentication method that adds a digital signature to outgoing email. The signature is verified by receiving servers using a public key published in your DNS. If the signature matches, the email is confirmed to have originated from your domain and has not been tampered with in transit.',
  },
  {
    question: 'What is a DKIM selector?',
    answer: 'A DKIM selector is a label that identifies which DKIM key to use when there are multiple keys for a domain. Selectors are arbitrary strings chosen by the sending service (e.g., "google" for Google Workspace, "selector1" for Microsoft 365, "k1" for Mailchimp). The DKIM record is published at {selector}._domainkey.{domain}.',
  },
  {
    question: 'Where do I find my DKIM selector?',
    answer: 'Your DKIM selector is provided by your email sending service. In Google Workspace, it\'s typically "google". In Microsoft 365, it\'s "selector1" and "selector2". In Mailchimp, it\'s "k1". Check your email provider\'s DNS setup guide or look in the DKIM signature of a sent email (the "s=" tag in the DKIM-Signature header).',
  },
  {
    question: 'Why is my DKIM key revoked?',
    answer: 'A DKIM key is revoked by publishing a DKIM record with an empty p= value. This is intentional and signals that the key should no longer be used. Reasons include key rotation, key compromise, or switching email providers. If you didn\'t intentionally revoke the key, check your DNS records and publish a new DKIM key.',
  },
  {
    question: 'Should I use RSA or Ed25519 for DKIM?',
    answer: 'RSA (2048-bit) is the safest choice for maximum compatibility, as it is supported by all email providers. Ed25519 offers equivalent security with much smaller keys but is not supported by some older mail servers. A best practice is to publish both an RSA key and an Ed25519 key with different selectors, letting modern servers prefer Ed25519.',
  },
];

interface DnsAnswer {
  data: string;
}

interface DkimLookupResult {
  domain: string;
  selector: string;
  found: boolean;
  record: string | null;
  tags: Record<string, string>;
  error?: string;
}

function cleanTxt(raw: string): string {
  return raw.replace(/^"|"$/g, '').replace(/"\s*"/g, '');
}

async function lookupDkim(domain: string, selector: string): Promise<DkimLookupResult> {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
  const sel = selector.trim().toLowerCase();
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(`${sel}._domainkey.${clean}`)}&type=TXT`, {
      headers: {Accept: 'application/dns-json'},
    });
    if (!res.ok) return {domain: clean, selector: sel, found: false, record: null, tags: {}, error: 'DNS lookup failed'};
    const data = await res.json() as {Answer?: DnsAnswer[]};
    const records = (data.Answer ?? [])
      .map((a: DnsAnswer) => cleanTxt(a.data))
      .filter(r => r.startsWith('v=DKIM1') || r.includes('k=') || r.includes('p='));
    if (records.length === 0) return {domain: clean, selector: sel, found: false, record: null, tags: {}};
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
    return {domain: clean, selector: sel, found: true, record, tags};
  } catch {
    return {domain: clean, selector: sel, found: false, record: null, tags: {}, error: 'DNS lookup failed'};
  }
}

export default function DkimCheckerPage() {
  const [domain, setDomain] = useState('');
  const [selector, setSelector] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DkimLookupResult | null>(null);
  const [analysis, setAnalysis] = useState<DkimAnalysis | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setAnalysis(null);

    try {
      const data = await lookupDkim(domain, selector);
      setResult(data);
      if (data.found && data.tags) {
        setAnalysis(analyzeDkim(data.tags));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NextSeo
        title="DKIM Record Checker | Free DKIM Lookup & Validator | Plunk"
        description="Free DKIM record checker. Look up your DKIM public key by domain and selector, validate the record, and get advice to fix misconfigurations."
        canonical="https://www.useplunk.com/tools/dkim-checker"
        openGraph={{
          title: 'DKIM Record Checker | Free DKIM Lookup & Validator | Plunk',
          description: 'Free DKIM record checker. Look up and validate your DKIM key by domain and selector.',
          url: 'https://www.useplunk.com/tools/dkim-checker',
          images: [{url: 'https://www.useplunk.com/api/og?title=Free+DKIM+Record+Checker&tag=Tool', alt: 'Plunk DKIM Checker', width: 1200, height: 630}],
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
                <span className={'font-medium text-neutral-900'}>§ T-06 &nbsp;— &nbsp;Tool</span>
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
                  DKIM record
                  <br />
                  checker
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Look up your domain&apos;s DKIM public key by selector. Verify the key is active, understand the
                  configuration, and get advice if something looks wrong.
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
                    <Key className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      DKIM record lookup
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
                    </div>

                    <div>
                      <label htmlFor="selector" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                        DKIM selector <span className={'text-err'}>*</span>
                      </label>
                      <Input
                        id="selector"
                        type="text"
                        value={selector}
                        onChange={e => setSelector(e.target.value)}
                        placeholder="google"
                        required
                        className={'w-full'}
                      />
                      <p className={'mt-1.5 text-xs text-neutral-500'}>
                        Not sure? Try a common selector below.
                      </p>
                    </div>

                    {/* Common selectors */}
                    <div>
                      <p className={'mb-2 text-xs font-medium text-neutral-500'}>Common selectors</p>
                      <div className={'flex flex-wrap gap-2'}>
                        {COMMON_SELECTORS.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setSelector(s.value)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              selector === s.value
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                            }`}
                          >
                            {s.label} <span style={{fontFamily: 'var(--font-mono)'}} className={'opacity-60'}>({s.value})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className={'w-full gap-2'} disabled={loading}>
                      <Key className={'h-4 w-4'} />
                      {loading ? 'Looking up DKIM record…' : 'Check DKIM record'}
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
                    <div className={'rounded-card border border-warn/25 bg-warn-surface p-8'}>
                      <div className={'flex items-start gap-3'}>
                        <XCircle className={'mt-0.5 h-5 w-5 shrink-0 text-warn'} />
                        <div>
                          <p className={'font-semibold text-warn'}>No DKIM record found</p>
                          <p className={'mt-1 text-ui text-warn'}>
                            {result.error
                              ? 'DNS lookup failed. Please check the domain and try again.'
                              : `No DKIM record was found at `}
                            {!result.error && (
                              <code style={{fontFamily: 'var(--font-mono)'}} className={'text-xs'}>
                                {result.selector}._domainkey.{result.domain}
                              </code>
                            )}
                          </p>
                          {!result.error && (
                            <p className={'mt-2 text-ui text-warn'}>
                              Check that you are using the correct selector. If your email provider has given you a specific selector, use that. If the record still doesn&apos;t appear, DNS propagation may still be in progress.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Lookup host */}
                      <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                        <p
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'mb-2 text-label text-neutral-500'}
                        >
                          Record found at
                        </p>
                        <code
                          style={{fontFamily: 'var(--font-mono)'}}
                          className={'text-ui font-medium text-neutral-700'}
                        >
                          {result.selector}._domainkey.{result.domain}
                        </code>

                        {result.record && (
                          <>
                            <p
                              style={{fontFamily: 'var(--font-mono)'}}
                              className={'mb-2 mt-6 text-label text-neutral-500'}
                            >
                              Raw record
                            </p>
                            <code
                              style={{fontFamily: 'var(--font-mono)'}}
                              className={'block break-all rounded-lg bg-neutral-50 px-4 py-3 text-xs text-neutral-700'}
                            >
                              {result.record.length > 200
                                ? `${result.record.slice(0, 200)}… [${result.record.length - 200} more characters]`
                                : result.record}
                            </code>
                          </>
                        )}
                      </div>

                      {analysis && (
                        <>
                          {/* Grade */}
                          <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                            <div className={'flex flex-col items-center gap-4 text-center'}>
                              <GradeBadge grade={analysis.grade} />
                            </div>
                          </div>

                          {/* Tags */}
                          {Object.keys(result.tags).length > 0 && (
                            <div className={'rounded-card border border-neutral-200 bg-white p-8'}>
                              <h3
                                style={{fontFamily: 'var(--font-display)'}}
                                className={'mb-6 text-lg font-bold text-neutral-900'}
                              >
                                Record tags
                              </h3>
                              <div className={'space-y-2'}>
                                {Object.entries(result.tags).map(([key, value]) => {
                                  const displayValue = key === 'p' && value.length > 48
                                    ? `${value.slice(0, 48)}… [${value.length - 48} more chars]`
                                    : value || '(empty — key revoked)';
                                  return (
                                    <div key={key} className={'flex items-start gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3'}>
                                      <div className={'flex min-w-0 flex-1 flex-col gap-0.5'}>
                                        <div className={'flex items-center gap-2'}>
                                          <span style={{fontFamily: 'var(--font-mono)'}} className={'text-xs font-bold text-neutral-700'}>
                                            {key}=
                                          </span>
                                          <span style={{fontFamily: 'var(--font-mono)'}} className={'truncate text-xs text-neutral-500'}>
                                            {displayValue}
                                          </span>
                                        </div>
                                        {TAG_DESCRIPTIONS[key] && (
                                          <span className={'text-xs text-neutral-500'}>{TAG_DESCRIPTIONS[key]}</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

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
                title={'How DKIM signing works.'}
                subtitle={'DKIM proves your email was sent by your domain and wasn\'t altered in transit.'}
              />

              <div className={'mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}>
                {[
                  {
                    title: 'Cryptographic signature',
                    body: 'Your sending server signs each email using a private key. The corresponding public key is published in DNS. Receiving servers verify the signature to confirm authenticity.',
                  },
                  {
                    title: 'Selector system',
                    body: 'Each DKIM key is identified by a selector. You can have multiple selectors (and keys) per domain, allowing key rotation and multiple sending providers at the same time.',
                  },
                  {
                    title: 'Tamper detection',
                    body: 'The DKIM signature covers specific email headers and the body. If the email is modified in transit, the signature breaks and DKIM fails — protecting against content manipulation.',
                  },
                  {
                    title: 'Key rotation',
                    body: 'Best practice is to rotate DKIM keys annually. Publish the new key under a different selector, update your sending infrastructure, then revoke the old key by setting p= to empty.',
                  },
                  {
                    title: 'DKIM alone is not enough',
                    body: 'Like SPF, DKIM authentication alone doesn\'t protect the visible From header. You need DMARC to enforce authentication policies and protect against spoofing.',
                  },
                  {
                    title: '2048-bit RSA minimum',
                    body: '1024-bit RSA keys are considered insecure. Use at least 2048-bit RSA or switch to Ed25519, which provides equivalent security with much smaller keys.',
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
                  Sign every email. Reach the inbox.
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Plunk configures DKIM signing automatically and guides you through setting up SPF and DMARC for your
                    domain.
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
                      href="/guides/what-is-dkim"
                      className={'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'}
                    >
                      What is DKIM?
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <FAQSection faqs={faqs} schemaId="faq-dkim-checker" />
      <Footer />
    </>
  );
}
