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
  ToolResult,
  ToolVerdict,
} from '../../components';
import type {FAQ} from '../../components';
import {motion} from 'framer-motion';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';
import {Button, Input} from '@plunk/ui';

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
    issues.push({type: 'warning', label: 'Single MX record, no fallback', detail: 'If this mail server is unavailable, email delivery will fail. Consider adding a secondary MX record with a higher priority number as a fallback.'});
  } else {
    issues.push({type: 'pass', label: 'Multiple MX records, fallback in place', detail: 'If the primary server is unreachable, mail will fall back to lower-priority servers.'});
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

const ISSUE_TONE = {pass: 'ok', warning: 'warn', error: 'err'} as const;

const VERDICTS = {
  ok: 'MX records are set up correctly',
  warn: 'MX records need attention',
  err: 'MX records have critical errors',
} as const;

function verdictTone(issues: MxIssue[]): keyof typeof VERDICTS {
  if (issues.some(i => i.type === 'error')) return 'err';
  if (issues.some(i => i.type === 'warning')) return 'warn';
  return 'ok';
}

const explainer = [
  {
    title: 'Sender looks up MX',
    body: 'When someone sends to you@domain.com, their mail server queries DNS for the MX records of domain.com. The priority numbers tell it which server to try first.',
  },
  {
    title: 'Connection to port 25',
    body: "The sending server opens an SMTP connection to port 25 on your mail server's hostname. If the connection fails, it tries the next MX in priority order.",
  },
  {
    title: 'Authentication checks',
    body: 'Your mail server runs SPF, DKIM, and DMARC checks on the incoming message. Failures may cause the message to be filtered or rejected depending on your policy.',
  },
];

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

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'MX record checker'}
            subtitle={
              'Look up the mail servers for any domain, see their priority, and check there is a fallback when one goes down.'
            }
          >
            <ToolPanel>
              <form onSubmit={handleCheck} className={'flex flex-col gap-3 sm:flex-row'}>
                <label htmlFor="mxDomain" className={'sr-only'}>
                  Domain name
                </label>
                <Input
                  id="mxDomain"
                  type="text"
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="example.com"
                  required
                  className={'h-11 flex-1'}
                />
                <Button type="submit" className={'h-11 px-6'} disabled={loading}>
                  {loading ? 'Checking…' : 'Check MX'}
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
                {result.error ? (
                  <ToolVerdict
                    tone={'err'}
                    title={'The lookup failed'}
                    detail={`Could not query MX records for ${result.domain}. Check the domain and try again.`}
                  />
                ) : !result.found || result.records.length === 0 ? (
                  <ToolVerdict
                    tone={'err'}
                    title={'No MX records found'}
                    detail={`Email cannot be delivered to ${result.domain}. Add at least one MX record pointing to your mail server in your DNS provider.`}
                  />
                ) : (
                  <>
                    <ToolVerdict
                      tone={verdictTone(result.issues)}
                      title={VERDICTS[verdictTone(result.issues)]}
                      detail={result.domain}
                    />

                    <ToolResult title={'Mail servers'}>
                      <ul className={'divide-y divide-neutral-100'}>
                        {result.records.map((rec, i) => (
                          <li key={i} className={'flex items-center gap-4 py-3 first:pt-0 last:pb-0'}>
                            <span
                              className={
                                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-50 font-code text-ui font-medium tabular-nums text-neutral-700'
                              }
                            >
                              {rec.priority}
                            </span>
                            <span className={'min-w-0 flex-1 truncate font-code text-ui font-medium text-neutral-900'}>
                              {rec.exchange || '(empty)'}
                            </span>
                            <ToolPill tone={'neutral'}>{priorityLabel(rec.priority)}</ToolPill>
                          </li>
                        ))}
                      </ul>
                    </ToolResult>

                    {result.issues.length > 0 && (
                      <ToolResult title={'What we found'}>
                        <ul className={'flex flex-col gap-4'}>
                          {result.issues.map((issue, i) => (
                            <ToolFinding
                              key={i}
                              tone={ISSUE_TONE[issue.type]}
                              label={issue.label}
                              detail={issue.detail}
                            />
                          ))}
                        </ul>
                      </ToolResult>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </ToolHero>

          <ToolExplainer
            title={'How email finds its destination'}
            subtitle={'MX records are the address book of email routing: without them, no one can send you mail.'}
            items={explainer}
          />

          <MoreTools current={'mx-checker'} />

          <FAQSection faqs={faqs} schemaId="faq-mx-checker" />

          <FeatureCTA
            title={'Email that reaches the inbox.'}
            body={
              'Plunk handles SPF, DKIM, and DMARC setup and keeps your sending reputation clean so email lands in the inbox.'
            }
            secondary={{href: '/tools/spf-checker', label: 'Check SPF record'}}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
