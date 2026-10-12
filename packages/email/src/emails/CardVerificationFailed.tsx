import {Heading, Link, Section, Text} from '@react-email/components';
import * as React from 'react';
import {EmailLayout} from '../common/EmailLayout';
import {Footer} from '../common/Footer';
import {Header} from '../common/Header';

interface CardVerificationFailedEmailProps {
  projectName: string;
  projectId: string;
  /** `declined`: the card refused the charge. `action_required`: the bank wants the cardholder, or declined for now. */
  variant?: 'declined' | 'action_required';
  dashboardUrl?: string;
  landingUrl?: string;
}

export function CardVerificationFailedEmail({
  projectName = 'My Project',
  projectId = 'proj_example123',
  variant = 'declined',
  dashboardUrl = 'https://next-app.useplunk.com',
  landingUrl = 'https://www.useplunk.com',
}: CardVerificationFailedEmailProps) {
  return (
    <EmailLayout>
      <Header />

      <Section className="px-8 pb-10 pt-10">
        <Heading className="mb-2 mt-0 text-2xl font-semibold tracking-tight text-gray-900">
          We couldn&apos;t verify your card
        </Heading>

        <Text className="mb-8 mt-0 text-base leading-relaxed text-gray-600">
          Sending is paused for <strong className="font-medium text-gray-900">{projectName}</strong>.{' '}
          {variant === 'declined'
            ? 'Your card declined the charge we use to confirm it can be billed automatically each month.'
            : 'Your bank didn’t approve the charge we use to confirm your card can be billed automatically each month. It may want you to confirm the payment, or the card may be temporarily unable to pay.'}
        </Text>

        <Section className="mb-8 rounded-lg bg-red-50 px-6 py-4" style={{border: '1px solid #fca5a5'}}>
          <Text className="mb-0 mt-0 text-sm leading-relaxed text-red-900">
            Nothing was collected. Update your card and we&apos;ll verify it straight away — sending resumes as soon
            as it passes.
          </Text>
        </Section>

        <Heading className="mb-4 mt-0 text-lg font-semibold text-gray-900">Why this happens</Heading>

        <Text className="mb-8 mt-0 text-sm leading-relaxed text-gray-600">
          Some cards — most often prepaid, virtual, and single-use cards — allow a payment you approve yourself but
          refuse recurring charges made later on your behalf. Because Plunk bills for usage at the end of each month,
          we need a card that accepts both.
        </Text>

        <Heading className="mb-4 mt-0 text-lg font-semibold text-gray-900">How to resume sending</Heading>

        <Section className="mb-8">
          <Section className="mb-3">
            <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Update your card</Text>
            <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
              Open billing settings, choose Manage billing, and add a standard credit or debit card. Prepaid cards
              aren&apos;t supported.
            </Text>
          </Section>

          <Section>
            <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Think this is a mistake?</Text>
            <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
              Contact support and we&apos;ll take another look at your account
            </Text>
          </Section>
        </Section>

        <Section className="mb-6">
          <Link
            href={`${dashboardUrl}/settings?tab=billing`}
            className="inline-block rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white no-underline"
          >
            Go to billing settings
          </Link>
        </Section>
      </Section>

      <Footer projectId={projectId} landingUrl={landingUrl} />
    </EmailLayout>
  );
}

export default CardVerificationFailedEmail;
