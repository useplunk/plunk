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
    issues.push({type: 'pass', label: 'Policy is p=reject, the strongest protection', detail: 'Failing messages are rejected outright. This is the strongest DMARC policy.'});
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

function policyLabel(policy: string): {label: string; tone: ToolTone | 'neutral'} {
  if (policy === 'reject') return {label: 'Reject', tone: 'ok'};
  if (policy === 'quarantine') return {label: 'Quarantine', tone: 'warn'};
  if (policy === 'none') return {label: 'None', tone: 'neutral'};
  return {label: 'Missing', tone: 'err'};
}

function policySummary(policy: string): string {
  if (policy === 'reject') return 'Full DMARC protection';
  if (policy === 'quarantine') return 'Partial protection';
  if (policy === 'none') return 'Monitoring only, no enforcement';
  return 'DMARC not enforcing';
}

const GRADES = {
  pass: {tone: 'ok', title: 'DMARC is fully enforced'},
  warning: {tone: 'warn', title: 'DMARC needs attention'},
  fail: {tone: 'err', title: 'DMARC has critical errors'},
} as const;

const ISSUE_TONE = {pass: 'ok', warning: 'warn', error: 'err'} as const;

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

const explainer = [
  {
    title: 'Monitor with p=none',
    body: 'Start here. DMARC is active but no action is taken on failures. Add rua= to receive aggregate reports and identify all your sending sources.',
  },
  {
    title: 'Quarantine with p=quarantine',
    body: "Once you're confident all legitimate senders pass, move to quarantine. Failing messages are sent to spam, reducing spoofing impact.",
  },
  {
    title: 'Reject with p=reject',
    body: 'Full enforcement. Failing messages are rejected by receiving servers. This is the goal — it completely prevents domain spoofing.',
  },
];

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

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'DMARC record checker'}
            subtitle={
              'Look up any domain’s DMARC policy, check its reporting setup, and see how close it is to full enforcement.'
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
                  {loading ? 'Checking…' : 'Check DMARC'}
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
                      title={result.error ? 'The lookup failed' : 'No DMARC record found'}
                      detail={
                        result.error
                          ? 'Check the domain and try again.'
                          : `Without DMARC, ${result.domain} has no enforcement policy and you won't receive authentication reports.`
                      }
                    />
                    {!result.error && (
                      <ToolResult title={`Add a TXT record to _dmarc.${result.domain}`}>
                        <ToolRecord>{`v=DMARC1; p=none; rua=mailto:dmarc@${result.domain}`}</ToolRecord>
                        <p className={'mt-3 text-ui text-neutral-600'}>
                          Start with p=none to monitor, then progress to quarantine and reject.
                        </p>
                      </ToolResult>
                    )}
                  </>
                ) : (
                  <>
                    {analysis && (
                      <ToolVerdict
                        tone={GRADES[analysis.grade].tone}
                        title={GRADES[analysis.grade].title}
                        detail={`${result.domain}: ${policySummary(analysis.policy)}`}
                      />
                    )}

                    <ToolResult title={'Record'}>
                      <ToolRecord>{result.record}</ToolRecord>
                    </ToolResult>

                    {analysis && (
                      <>
                        <ToolResult title={'Tags'}>
                          <ul className={'divide-y divide-neutral-100'}>
                            {Object.entries(result.tags).map(([key, value]) => (
                              <li
                                key={key}
                                className={'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4'}
                              >
                                <div className={'flex min-w-0 flex-1 items-center gap-2'}>
                                  <span className={'flex-shrink-0 font-code text-ui font-medium text-neutral-900'}>
                                    {key}=
                                  </span>
                                  {key === 'p' || key === 'sp' ? (
                                    <ToolPill tone={policyLabel(value).tone}>{policyLabel(value).label}</ToolPill>
                                  ) : (
                                    <span className={'truncate font-code text-ui text-neutral-500'}>{value}</span>
                                  )}
                                </div>
                                {TAG_DESCRIPTIONS[key] && (
                                  <span className={'flex-shrink-0 text-ui text-neutral-500'}>{TAG_DESCRIPTIONS[key]}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </ToolResult>

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
            title={'From monitoring to full enforcement'}
            subtitle={'DMARC is a journey: start with none, build confidence, then enforce.'}
            items={explainer}
          />

          <MoreTools current={'dmarc-checker'} />

          <FAQSection faqs={faqs} schemaId="faq-dmarc-checker" />

          <FeatureCTA
            title={'Email that reaches the inbox.'}
            body={'Plunk walks you through SPF, DKIM, and DMARC setup and monitors your sending reputation over time.'}
            secondary={{href: '/guides/what-is-dmarc', label: 'What is DMARC?'}}
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
