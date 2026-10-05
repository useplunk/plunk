import {Heading, Link, Section, Text} from '@react-email/components';
import * as React from 'react';
import {EmailLayout} from '../common/EmailLayout';
import {Footer} from '../common/Footer';
import {Header} from '../common/Header';

interface ProjectDisabledRates {
  total: number;
  bounces: number;
  complaints: number;
  bounceRate: number;
  complaintRate: number;
}

interface ProjectDisabledEmailProps {
  projectName: string;
  projectId: string;
  /**
   * `reputation`: bounce/complaint rates the user can see in their dashboard, so we say so.
   * `policy`: content-based (e.g. phishing) — deliberately vague, never name the cause.
   */
  reason?: 'reputation' | 'policy';
  // Which metrics crossed a critical threshold. Only used for `reputation`.
  metrics?: ('bounce' | 'complaint')[];
  sevenDay?: ProjectDisabledRates;
  allTime?: ProjectDisabledRates;
  dashboardUrl?: string;
  landingUrl?: string;
}

const METRIC_COPY = {
  bounce: {
    label: 'Bounce rate',
    noun: 'bounces',
    rate: (r: ProjectDisabledRates) => `${r.bounceRate.toFixed(2)}%`,
    count: (r: ProjectDisabledRates) => r.bounces,
  },
  complaint: {
    label: 'Complaint rate',
    noun: 'complaints',
    rate: (r: ProjectDisabledRates) => `${r.complaintRate.toFixed(3)}%`,
    count: (r: ProjectDisabledRates) => r.complaints,
  },
} as const;

function RateRow({
  period,
  metric,
  rates,
}: {
  period: string;
  metric: 'bounce' | 'complaint';
  rates: ProjectDisabledRates;
}) {
  const copy = METRIC_COPY[metric];
  return (
    <Text className="mb-0 mt-0 text-sm leading-relaxed text-red-900">
      {period}: <strong className="font-medium">{copy.rate(rates)}</strong> ({copy.count(rates).toLocaleString()}{' '}
      {copy.noun} out of {rates.total.toLocaleString()} emails)
    </Text>
  );
}

export function ProjectDisabledEmail({
  projectName = 'My Project',
  projectId = 'proj_example123',
  reason = 'policy',
  metrics = ['bounce'],
  sevenDay = {total: 1200, bounces: 96, complaints: 1, bounceRate: 8, complaintRate: 0.083},
  allTime = {total: 5400, bounces: 162, complaints: 2, bounceRate: 3, complaintRate: 0.037},
  dashboardUrl = 'https://next-app.useplunk.com',
  landingUrl = 'https://www.useplunk.com',
}: ProjectDisabledEmailProps) {
  if (reason === 'reputation') {
    const metricNouns = metrics.map(m => METRIC_COPY[m].noun).join(' and ');

    return (
      <EmailLayout>
        <Header />

        <Section className="px-8 pb-10 pt-10">
          <Heading className="mb-2 mt-0 text-2xl font-semibold tracking-tight text-gray-900">Project disabled</Heading>

          <Text className="mb-8 mt-0 text-base leading-relaxed text-gray-600">
            Your project <strong className="font-medium text-gray-900">{projectName}</strong> has been automatically
            disabled because it received too many {metricNouns}. All scheduled campaigns and workflows have been
            cancelled.
          </Text>

          {metrics.map(metric => (
            <Section key={metric} className="mb-4 rounded-lg bg-red-50 px-6 py-4" style={{border: '1px solid #fca5a5'}}>
              <Text className="mb-2 mt-0 text-sm font-medium text-red-900">{METRIC_COPY[metric].label}</Text>
              <RateRow period="Last 7 days" metric={metric} rates={sevenDay} />
              <RateRow period="All time" metric={metric} rates={allTime} />
            </Section>
          ))}

          <Text className="mb-8 mt-4 text-sm leading-relaxed text-gray-600">
            High bounce and complaint rates harm deliverability for every sender on our platform, so we pause sending
            when they get too high. You can follow these numbers on the security tab of your project settings.
          </Text>

          <Heading className="mb-4 mt-0 text-lg font-semibold text-gray-900">How to restore your project</Heading>

          <Section className="mb-8">
            {metrics.includes('bounce') && (
              <Section className="mb-3">
                <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Clean your contact list</Text>
                <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
                  Remove invalid, outdated or purchased addresses. Bounces mostly come from addresses that no longer
                  exist or were never opted in
                </Text>
              </Section>
            )}

            {metrics.includes('complaint') && (
              <Section className="mb-3">
                <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Only email people who opted in</Text>
                <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
                  Complaints happen when recipients mark your email as spam. Make sure every contact asked to hear from
                  you and can easily unsubscribe
                </Text>
              </Section>
            )}

            <Section className="mb-3">
              <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Contact support</Text>
              <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
                Once you have addressed the cause, reach out to support with what you changed and we will review
                re-enabling your project
              </Text>
            </Section>
          </Section>

          <Section className="mb-6">
            <Link
              href={`${dashboardUrl}/settings?tab=security`}
              className="inline-block rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white no-underline"
            >
              View sending reputation
            </Link>
          </Section>
        </Section>

        <Footer projectId={projectId} landingUrl={landingUrl} />
      </EmailLayout>
    );
  }

  return (
    <EmailLayout>
      <Header />

      <Section className="px-8 pb-10 pt-10">
        <Heading className="mb-2 mt-0 text-2xl font-semibold tracking-tight text-gray-900">Project disabled</Heading>

        <Text className="mb-8 mt-0 text-base leading-relaxed text-gray-600">
          Your project <strong className="font-medium text-gray-900">{projectName}</strong> has been disabled. All
          scheduled campaigns and workflows have been cancelled.
        </Text>

        <Section className="mb-8 rounded-lg bg-red-50 px-6 py-4" style={{border: '1px solid #fca5a5'}}>
          <Text className="mb-0 mt-0 text-sm leading-relaxed text-red-900">
            Your project has been flagged during a routine review and disabled to protect your account and our platform.
            Please contact our support team for more details and to resolve this issue.
          </Text>
        </Section>

        <Heading className="mb-4 mt-0 text-lg font-semibold text-gray-900">Next steps</Heading>

        <Section className="mb-8">
          <Section className="mb-3">
            <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Contact support</Text>
            <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
              Reach out to our support team to understand the reason for the suspension and how to resolve it
            </Text>
          </Section>

          <Section className="mb-3">
            <Text className="mb-1 mt-0 text-sm font-medium text-gray-900">Review your account</Text>
            <Text className="mb-0 mt-0 text-sm leading-relaxed text-gray-600">
              While you wait, review your sending practices and ensure they comply with our terms of service
            </Text>
          </Section>
        </Section>

        <Section className="mb-6">
          <Link
            href={dashboardUrl}
            className="inline-block rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white no-underline"
          >
            View project dashboard
          </Link>
        </Section>
      </Section>

      <Footer projectId={projectId} landingUrl={landingUrl} />
    </EmailLayout>
  );
}

export default ProjectDisabledEmail;
