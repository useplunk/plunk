import type {EmailVerificationResult as VerificationResult} from '@plunk/types';

import {ToolPill, ToolResult, ToolVerdict} from './ToolPage';
import type {ToolTone} from './ToolPage';

interface EmailVerificationResultProps {
  result: VerificationResult;
}

interface Check {
  label: string;
  detail: string;
  tone: ToolTone | 'neutral';
  state: string;
}

function getChecks(result: VerificationResult): Check[] {
  return [
    {
      label: 'Domain exists',
      detail: 'The domain has nameservers (NS records)',
      tone: result.domainExists ? 'ok' : 'err',
      state: result.domainExists ? 'Yes' : 'No',
    },
    {
      label: 'MX records',
      detail: 'A mail server is configured to receive email',
      tone: result.hasMxRecords ? 'ok' : 'err',
      state: result.hasMxRecords ? 'Found' : 'Missing',
    },
    {
      label: 'Website',
      detail: 'DNS A/AAAA records found (not required for email)',
      tone: result.hasWebsite ? 'ok' : 'neutral',
      state: result.hasWebsite ? 'Found' : 'None',
    },
    {
      label: 'Disposable address',
      detail: 'A temporary email service',
      tone: result.isDisposable ? 'warn' : 'ok',
      state: result.isDisposable ? 'Disposable' : 'No',
    },
    {
      label: 'Personal address',
      detail: 'A free email provider, like Gmail or Hotmail',
      tone: 'neutral',
      state: result.isPersonalEmail ? 'Yes' : 'No',
    },
    {
      label: 'Forwarding service',
      detail: 'An alias or forwarding address',
      tone: result.isAlias ? 'neutral' : 'ok',
      state: result.isAlias ? 'Yes' : 'No',
    },
    {
      label: 'Typo check',
      detail: 'Common misspellings of popular domains',
      tone: result.isTypo ? 'warn' : 'ok',
      state: result.isTypo ? 'Likely typo' : 'None found',
    },
    {
      label: 'Plus addressing',
      detail: 'Uses a + tag, like user+tag@domain.com',
      tone: 'neutral',
      state: result.isPlusAddressed ? 'Yes' : 'No',
    },
  ];
}

function getVerdict(result: VerificationResult): {tone: ToolTone; title: string} {
  if (!result.valid) return {tone: 'err', title: 'This address is invalid'};
  if (result.isDisposable || result.isTypo) return {tone: 'warn', title: 'This address is risky'};
  return {tone: 'ok', title: 'This address looks valid'};
}

export function EmailVerificationResult({result}: EmailVerificationResultProps) {
  const verdict = getVerdict(result);

  return (
    <div className={'flex flex-col gap-4'}>
      <ToolVerdict
        tone={verdict.tone}
        title={verdict.title}
        detail={<span className={'break-all font-code text-ui'}>{result.email}</span>}
      />

      {result.suggestedEmail && (
        <ToolResult title={'Did you mean'}>
          <p className={'break-all font-code text-ui font-medium text-neutral-900'}>{result.suggestedEmail}</p>
        </ToolResult>
      )}

      <ToolResult title={'Checks'}>
        <ul className={'divide-y divide-neutral-100'}>
          {getChecks(result).map(check => (
            <li key={check.label} className={'flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0'}>
              <div className={'min-w-0'}>
                <p className={'text-ui font-semibold text-neutral-900'}>{check.label}</p>
                <p className={'mt-0.5 text-ui text-neutral-600'}>{check.detail}</p>
              </div>
              <ToolPill tone={check.tone}>{check.state}</ToolPill>
            </li>
          ))}
        </ul>
      </ToolResult>

      {result.reasons && result.reasons.length > 0 && (
        <ToolResult title={'What we found'}>
          <ul className={'flex list-disc flex-col gap-2 pl-5 text-ui text-neutral-700'}>
            {result.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </ToolResult>
      )}
    </div>
  );
}
