import React from 'react';

import {useConfig} from '../lib/hooks/useConfig';

const link = 'text-neutral-700 underline underline-offset-2 hover:text-neutral-900 transition-colors';

/**
 * The agreement line under the signup and login forms. Rendered only on the hosted service
 * (billing enabled): self-hosted instances have their own terms. Signup records acceptance
 * server-side with the same condition (UserService.termsAcceptance), so keep the two in step.
 */
export function LegalConsent({lead}: {lead: string}) {
  const {data: config} = useConfig();
  if (!config?.features.billing.enabled || config.features.signup.signupsDisabled) return null;

  const landing = config.urls.landing;
  return (
    <p className="text-center text-xs leading-relaxed text-neutral-600 text-balance">
      {lead} you agree to the{' '}
      <a href={`${landing}/terms`} target="_blank" rel="noopener noreferrer" className={link}>
        Terms of Service
      </a>{' '}
      and{' '}
      <a href={`${landing}/dpa`} target="_blank" rel="noopener noreferrer" className={link}>
        Data Processing Agreement
      </a>
      , and confirm you have read the{' '}
      <a href={`${landing}/privacy`} target="_blank" rel="noopener noreferrer" className={link}>
        Privacy Policy
      </a>
      . We occasionally email product updates; you can unsubscribe from any of them.
    </p>
  );
}
