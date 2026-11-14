import './global.css';
import {DocsLayout} from 'fumadocs-ui/layouts/docs';
import {RootProvider} from 'fumadocs-ui/provider/next';
import Script from 'next/script';
import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import React from 'react';

import {baseOptions} from '@/app/layout.config';
import {source} from '@/lib/source';

const description =
  'Documentation for Plunk, the open-source email platform. Learn how to integrate Plunk into your application and manage your email communications.';

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.useplunk.com'),
  title: {default: 'Plunk Documentation', template: '%s | Plunk Docs'},
  description,
  openGraph: {
    type: 'website',
    siteName: 'Plunk Documentation',
    title: 'Plunk Documentation',
    description,
    images: ['/api/og?title=Documentation'],
  },
  twitter: {card: 'summary_large_image', site: '@useplunk'},
};

export default function Layout({children}: {children: ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runtime environment configuration - must load before any app code */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/__env.js" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/favicon/favicon-16x16.png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="apple-mobile-web-app-title" content="Plunk" />
        <meta name="application-name" content="Plunk" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <Script
        defer
        src="https://analytics.driaug.com/script.js"
        data-website-id="ba0b7094-e693-492e-902a-c62aab868715"
        data-domains="docs.useplunk.com"
      />
      <body className="flex flex-col min-h-screen antialiased text-neutral-800" suppressHydrationWarning>
        <RootProvider
          theme={{
            enabled: false,
          }}
        >
          <DocsLayout tree={source.pageTree} {...baseOptions}>
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  );
}
