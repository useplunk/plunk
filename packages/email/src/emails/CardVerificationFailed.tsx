import {Heading, Link, Section, Text} from '@react-email/components';
import * as React from 'react';
import {EmailLayout} from '../common/EmailLayout';
import {Footer} from '../common/Footer';
import {Header} from '../common/Header';

interface CardVerificationFailedEmailProps {
  projectName: string;
  projectId: string;
  dashboardUrl?: string;
  landingUrl?: string;
}

export function CardVerificationFailedEmail({
  projectName = 'My Project',
  projectId = 'proj_example123',
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
          Your project <strong className="font-medium text-gray-900">{projectName}</strong> has been disabled. Your card
          completed the initial payment, but declined the follow-up charge we use to confirm it can be billed
          automatically each month.
        </Text>

        <Section className="mb-8 rounded-lg bg-red-50 px-6 py-4" style={{border: '1px solid #fca5a5'}}>
          <Text className="mb-0 mt-0 text-sm leading-relaxed text-red-900">
            Email sending is currently blocked and your subscription has been cancelled. Your onboarding fee has been
            refunded in full, and no further charges will be made. Refunds usually appear on your statement within 5 to
            10 business days.
          </Text>
        </Section>

        <Heading className="mb-4 mt-0 text-lg font-semibold text-gray-900">Why this happens</Heading>

        <Text className="mb-8 mt-0 text-sm leading-relaxed text-gray-600">
          Some cards — most often prepaid, virtual, and single-use cards — allow a payment you approve yourself but
          refuse recurring charges made later on your behalf. Because Plunk bills for usage at the end of each month,
          we need a card that accepts both.
        </Text>

        <Heading className="mb-4 mt-0 text-lg font-semibold text-gray-900">How to get started again</Heading>

        <Section className="mb-8">
          <Section className="mb-3">
            <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Use a standard credit or debit card</Text>
            <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
              Sign up again with a card that supports recurring payments
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
