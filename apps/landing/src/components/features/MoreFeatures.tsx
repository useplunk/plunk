import Link from 'next/link';
import React from 'react';

const FEATURES = [
  {title: 'Transactional email', description: 'Send from your app with one API call', href: '/features/transactional-email'},
  {title: 'Campaigns', description: 'Newsletters and product updates', href: '/features/campaigns'},
  {title: 'Workflows', description: 'Automate email from product events', href: '/features/workflows'},
  {title: 'Segments', description: 'Audiences that stay up to date', href: '/features/segments'},
  {title: 'Email editor', description: 'Visual and HTML in one editor', href: '/features/email-editor'},
  {title: 'Inbound email', description: 'Receive email at your domain', href: '/features/inbound-email'},
  {title: 'SMTP', description: 'Send from any existing client', href: '/features/smtp'},
  {title: 'MCP server', description: 'Let your agent run your email', href: '/features/mcp'},
];

/**
 * The other features, closing every feature page. Without it a feature page
 * only linked out through the navbar menu (mounted on open, so invisible to
 * crawlers) and the footer.
 */
export function MoreFeatures({current}: {current: string}) {
  const others = FEATURES.filter(feature => feature.href !== current);

  return (
    <nav aria-label={'Other features'} className={'mx-auto max-w-[88rem] px-6 pb-20 sm:px-10'}>
      <p className={'text-label font-semibold text-neutral-500'}>More of Plunk</p>
      <ul className={'mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4'}>
        {others.map(feature => (
          <li key={feature.href}>
            <Link href={feature.href} className={'group block'}>
              <span className={'block text-ui font-semibold text-neutral-900'}>{feature.title}</span>
              <span className={'block text-ui text-neutral-600 transition group-hover:text-neutral-900'}>
                {feature.description}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link href={'/vs'} className={'group block'}>
            <span className={'block text-ui font-semibold text-neutral-900'}>Comparisons</span>
            <span className={'block text-ui text-neutral-600 transition group-hover:text-neutral-900'}>
              Plunk vs Resend, SendGrid, and more
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
