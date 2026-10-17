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
  ToolPill,
  ToolRecord,
  ToolResult,
  ToolVerdict,
} from '../../components';
import type {FAQ, ToolTone} from '../../components';
import {motion} from 'framer-motion';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {Button, Input} from '@plunk/ui';

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
    issues.push({
      type: 'warning',
      label: 'No "all" mechanism',
      detail: 'SPF records should end with -all, ~all, or ?all to define default behaviour for unlisted senders.',
    });
  } else if (allMechanism === '+all') {
    issues.push({
      type: 'error',
      label: '+all allows any server to send',
      detail:
        '+all means any mail server in the world can send email claiming to be from your domain, completely defeating SPF protection.',
    });
  } else if (allMechanism === '?all') {
    issues.push({
      type: 'warning',
      label: '?all is too permissive',
      detail: '?all (neutral) gives no protection. Consider upgrading to ~all (softfail) or -all (hard fail).',
    });
  } else if (allMechanism === '~all') {
    issues.push({
      type: 'warning',
      label: '~all softfail is acceptable but not optimal',
      detail:
        'Softfail marks unauthorised senders as suspicious but still delivers them. Prefer -all for maximum protection once your legitimate senders are configured.',
    });
  } else if (allMechanism === '-all') {
    issues.push({
      type: 'pass',
      label: '-all hard fail is the strongest policy',
      detail: 'Mail servers are instructed to reject email from any server not listed in your SPF record.',
    });
  }

  if (lookupCount > 8) {
    issues.push({
      type: 'error',
      label: `DNS lookup limit exceeded (${lookupCount}/10)`,
      detail: `SPF is limited to 10 DNS lookups. Exceeding this causes a PermError, making SPF fail permanently. Consolidate includes or use IP ranges.`,
    });
  } else if (lookupCount > 6) {
    issues.push({
      type: 'warning',
      label: `Approaching DNS lookup limit (${lookupCount}/10)`,
      detail: 'Adding more senders could push you over the 10 lookup limit. Monitor and consolidate where possible.',
    });
  } else {
    issues.push({
      type: 'pass',
      label: `DNS lookups within limit (${lookupCount}/10)`,
      detail: 'Your SPF record uses an acceptable number of DNS lookups.',
    });
  }

  const ptrMechs = mechanisms.filter(m => m.type === 'ptr');
  if (ptrMechs.length > 0) {
    issues.push({
      type: 'warning',
      label: 'ptr mechanism is deprecated',
      detail:
        'The ptr mechanism is slow and unreliable. RFC 7208 recommends avoiding it. Use ip4/ip6 or include instead.',
    });
  }

  const grade = issues.some(i => i.type === 'error')
    ? 'fail'
    : issues.some(i => i.type === 'warning')
      ? 'warning'
      : 'pass';

  return {mechanisms, allMechanism, issues, lookupCount, grade};
}

function qualifierLabel(q: string): {label: string; tone: ToolTone | 'neutral'} {
  if (q === '+') return {label: 'Pass', tone: 'ok'};
  if (q === '-') return {label: 'Fail', tone: 'err'};
  if (q === '~') return {label: 'Softfail', tone: 'warn'};
  return {label: 'Neutral', tone: 'neutral'};
}

const GRADES = {
  pass: {tone: 'ok', title: 'SPF is set up correctly'},
  warning: {tone: 'warn', title: 'SPF needs attention'},
  fail: {tone: 'err', title: 'SPF has critical errors'},
} as const;

const ISSUE_TONE = {pass: 'ok', warning: 'warn', error: 'err'} as const;

const explainer = [
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
];

const faqs: FAQ[] = [
  {
    question: 'What is an SPF record?',
    answer:
      'An SPF (Sender Policy Framework) record is a DNS TXT record that lists the mail servers authorised to send email on behalf of your domain. Receiving mail servers check this record to verify that incoming email claiming to be from your domain was sent by an authorised server. Without SPF, anyone can spoof your domain in the From address.',
  },
  {
    question: 'What does -all vs ~all mean?',
    answer:
      '-all (hard fail) instructs receiving servers to reject any email not matching your SPF record. ~all (softfail) marks non-matching emails as suspicious but still delivers them. For production domains, -all is recommended once all your legitimate sending sources are added.',
  },
  {
    question: 'Why is there a 10 DNS lookup limit?',
    answer:
      'RFC 7208 limits SPF to 10 DNS lookups to prevent denial-of-service attacks and excessive DNS load. Each include, a, mx, ptr, and exists mechanism counts as one lookup. Exceeding 10 lookups causes a PermError, which effectively makes SPF fail for your domain.',
  },
  {
    question: 'Can I have multiple SPF records?',
    answer:
      'No. Having more than one SPF (v=spf1) TXT record on your domain causes a PermError and breaks SPF authentication. If you need to authorise multiple senders, combine everything into a single SPF record using multiple mechanisms.',
  },
  {
    question: 'Does SPF alone protect against spoofing?',
    answer:
      'SPF alone is not enough. SPF only validates the envelope sender (the "Return-Path" address), not the visible "From" header. DMARC is required to connect SPF (and DKIM) validation to the From header and actually prevent spoofing of your visible sender address.',
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
  const clean = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(clean)}&type=TXT`, {
      headers: {Accept: 'application/dns-json'},
    });
    if (!res.ok) return {domain: clean, found: false, multiple: false, records: [], error: 'DNS lookup failed'};
    const data = (await res.json()) as {Answer?: DnsAnswer[]};
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
          description:
            'Free SPF record checker. Look up and validate your domain SPF record and get actionable deliverability advice.',
          url: 'https://www.useplunk.com/tools/spf-checker',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Free+SPF+Record+Checker&tag=Tool',
              alt: 'Plunk SPF Checker',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

      <Navbar />

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'SPF record checker'}
            subtitle={
              'Look up any domain’s SPF record, see who is allowed to send for it, and catch the mistakes that hurt deliverability.'
            }
          >
            <ToolPanel>
              <form onSubmit={handleCheck} className={'flex flex-col gap-3 sm:flex-row'}>
                <label htmlFor="domain" className={'sr-only'}>
                  Domain name
                </label>
                <Input
                  id="domain"
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="example.com"
                  required
                  className={'h-11 flex-1'}
                />
                <Button type="submit" className={'h-11 px-6'} disabled={loading}>
                  {loading ? 'Checking…' : 'Check SPF'}
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
                  <>
                    <ToolVerdict
                      tone={'err'}
                      title={result.error ? 'The lookup failed' : 'No SPF record found'}
                      detail={
                        result.error
                          ? 'Check the domain and try again.'
                          : `Without SPF, anyone can send email that claims to be from ${result.domain}, and your real email is more likely to land in spam.`
                      }
                    />
                    {!result.error && (
                      <ToolResult title={`Add a TXT record to ${result.domain}`}>
                        <ToolRecord>v=spf1 include:your-email-provider.com -all</ToolRecord>
                      </ToolResult>
                    )}
                  </>
                ) : (
                  <>
                    {parsed && (
                      <ToolVerdict
                        tone={GRADES[parsed.grade].tone}
                        title={GRADES[parsed.grade].title}
                        detail={result.domain}
                      />
                    )}

                    {result.multiple && (
                      <ToolVerdict
                        tone={'err'}
                        title={'More than one SPF record'}
                        detail={
                          'Two SPF records cause a PermError and break SPF entirely. Merge them into a single v=spf1 record.'
                        }
                      />
                    )}

                    <ToolResult title={'Record'}>
                      <ToolRecord>{result.records[0]}</ToolRecord>
                    </ToolResult>

                    {parsed && (
                      <>
                        <ToolResult title={'Who can send'}>
                          <ul className={'divide-y divide-neutral-100'}>
                            {parsed.mechanisms.map((m, i) => {
                              const {label, tone} = qualifierLabel(m.qualifier);
                              return (
                                <li key={i} className={'flex items-center gap-3 py-3 first:pt-0'}>
                                  <ToolPill tone={tone}>{label}</ToolPill>
                                  <span className={'font-code text-ui font-medium text-neutral-900'}>{m.type}</span>
                                  {m.value && (
                                    <span className={'truncate font-code text-ui text-neutral-500'}>{m.value}</span>
                                  )}
                                </li>
                              );
                            })}
                            {parsed.allMechanism && (
                              <li className={'flex items-center gap-3 py-3 last:pb-0'}>
                                <ToolPill tone={qualifierLabel(parsed.allMechanism[0] ?? '+').tone}>
                                  {qualifierLabel(parsed.allMechanism[0] ?? '+').label}
                                </ToolPill>
                                <span className={'font-code text-ui font-medium text-neutral-900'}>all</span>
                                <span className={'text-ui text-neutral-500'}>Everyone else</span>
                              </li>
                            )}
                          </ul>
                        </ToolResult>

                        <ToolResult title={'What we found'}>
                          <ul className={'flex flex-col gap-4'}>
                            {parsed.issues.map((issue, i) => (
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
            title={'How SPF protects your domain'}
            subtitle={'SPF is the first line of defence against email spoofing and phishing.'}
            items={explainer}
          />

          <MoreTools current={'spf-checker'} />

          <FAQSection faqs={faqs} schemaId="faq-spf-checker" />

          <FeatureCTA
            title={'SPF, DKIM and DMARC, handled.'}
            body={'Plunk walks you through domain authentication and keeps an eye on your sending reputation.'}
            secondary={{href: '/guides/what-is-spf', label: 'What is SPF?'}}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
