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
  ToolRecord,
  ToolResult,
  ToolVerdict,
} from '../../components';
import type {FAQ} from '../../components';
import {motion} from 'framer-motion';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {Button, Input} from '@plunk/ui';

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

const GRADES = {
  pass: {tone: 'ok', title: 'DKIM key is valid'},
  warning: {tone: 'warn', title: 'DKIM needs attention'},
  fail: {tone: 'err', title: 'DKIM key is revoked'},
} as const;

const ISSUE_TONE = {pass: 'ok', warning: 'warn', error: 'err'} as const;

const TAG_DESCRIPTIONS: Record<string, string> = {
  v: 'DKIM version',
  k: 'Key type (rsa or ed25519)',
  p: 'Base64-encoded public key',
  t: 'Flags (y=testing, s=strict service)',
  s: 'Service type restriction',
  h: 'Acceptable hash algorithms',
  n: 'Notes (human-readable)',
};

const explainer = [
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
    body: "Like SPF, DKIM authentication alone doesn't protect the visible From header. You need DMARC to enforce authentication policies and protect against spoofing.",
  },
  {
    title: '2048-bit RSA minimum',
    body: '1024-bit RSA keys are considered insecure. Use at least 2048-bit RSA or switch to Ed25519, which provides equivalent security with much smaller keys.',
  },
];

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

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'DKIM record checker'}
            subtitle={
              'Look up a domain’s DKIM public key by selector, check that it is active, and see what every tag in the record does.'
            }
          >
            <ToolPanel>
              <form onSubmit={handleCheck} className={'flex flex-col gap-5'}>
                <div className={'grid gap-4 sm:grid-cols-2'}>
                  <div>
                    <label htmlFor="domain" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                      Domain
                    </label>
                    <Input
                      id="domain"
                      type="text"
                      value={domain}
                      onChange={e => setDomain(e.target.value)}
                      placeholder="example.com"
                      required
                      className={'h-11'}
                    />
                  </div>
                  <div>
                    <label htmlFor="selector" className={'mb-2 block text-ui font-medium text-neutral-900'}>
                      Selector
                    </label>
                    <Input
                      id="selector"
                      type="text"
                      value={selector}
                      onChange={e => setSelector(e.target.value)}
                      placeholder="google"
                      required
                      className={'h-11'}
                    />
                  </div>
                </div>

                <div>
                  <p className={'mb-2 text-ui text-neutral-500'}>Not sure? Try a common selector.</p>
                  <div className={'flex flex-wrap gap-2'}>
                    {COMMON_SELECTORS.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSelector(s.value)}
                        className={`rounded-full border px-3 py-1 text-label font-medium transition ${
                          selector === s.value
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
                        }`}
                      >
                        {s.label} <span className={'font-code opacity-60'}>({s.value})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className={'h-11 px-6 sm:self-start'} disabled={loading}>
                  {loading ? 'Checking…' : 'Check DKIM'}
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
                {!result.found ? (
                  <ToolVerdict
                    tone={result.error ? 'err' : 'warn'}
                    title={result.error ? 'The lookup failed' : 'No DKIM record found'}
                    detail={
                      result.error ? (
                        'Check the domain and try again.'
                      ) : (
                        <>
                          Nothing is published at{' '}
                          <span className={'font-code text-ui text-neutral-800'}>
                            {result.selector}._domainkey.{result.domain}
                          </span>
                          . Check that you are using the selector your email provider gave you. If you just added the
                          record, DNS may still be propagating.
                        </>
                      )
                    }
                  />
                ) : (
                  <>
                    {analysis && (
                      <ToolVerdict
                        tone={GRADES[analysis.grade].tone}
                        title={GRADES[analysis.grade].title}
                        detail={
                          <span className={'font-code text-ui'}>
                            {result.selector}._domainkey.{result.domain}
                          </span>
                        }
                      />
                    )}

                    {result.record && (
                      <ToolResult title={'Record'}>
                        <ToolRecord>
                          {result.record.length > 200
                            ? `${result.record.slice(0, 200)}… [${result.record.length - 200} more characters]`
                            : result.record}
                        </ToolRecord>
                      </ToolResult>
                    )}

                    {analysis && (
                      <>
                        {Object.keys(result.tags).length > 0 && (
                          <ToolResult title={'Tags'}>
                            <ul className={'divide-y divide-neutral-100'}>
                              {Object.entries(result.tags).map(([key, value]) => {
                                const displayValue =
                                  key === 'p' && value.length > 48
                                    ? `${value.slice(0, 48)}… [${value.length - 48} more chars]`
                                    : value || '(empty, key revoked)';
                                return (
                                  <li key={key} className={'flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0'}>
                                    <div className={'flex min-w-0 items-center gap-2'}>
                                      <span className={'font-code text-ui font-medium text-neutral-900'}>{key}=</span>
                                      <span className={'truncate font-code text-ui text-neutral-500'}>
                                        {displayValue}
                                      </span>
                                    </div>
                                    {TAG_DESCRIPTIONS[key] && (
                                      <span className={'text-ui text-neutral-500'}>{TAG_DESCRIPTIONS[key]}</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </ToolResult>
                        )}

                        <ToolResult title={'What we found'}>
                          <ul className={'flex flex-col gap-4'}>
                            {analysis.issues.map((issue, i) => (
                              <ToolFinding
                                key={i}
                                tone={ISSUE_TONE[issue.type]}
                                label={issue.label}
                                detail={issue.detail}
                              />
                            ))}
                          </ul>
                        </ToolResult>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </ToolHero>

          <ToolExplainer
            title={'How DKIM signing works'}
            subtitle={"DKIM proves your email was sent by your domain and wasn't altered in transit."}
            items={explainer}
          />

          <MoreTools current={'dkim-checker'} />

          <FAQSection faqs={faqs} schemaId="faq-dkim-checker" />

          <FeatureCTA
            title={'Sign every email. Reach the inbox.'}
            body={
              'Plunk configures DKIM signing automatically and guides you through setting up SPF and DMARC for your domain.'
            }
            secondary={{href: '/guides/what-is-dkim', label: 'What is DKIM?'}}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
