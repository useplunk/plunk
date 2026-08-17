import '../styles/globals.css';
import React, {useEffect} from 'react';
import Head from 'next/head';
import {AppProps} from 'next/app';
import {useRouter} from 'next/router';
import {toast, Toaster} from 'sonner';
import {SWRConfig} from 'swr';
import {network} from '../lib/network';
import {hasMarkdownVariant} from '../content/markdown-slugs';
import {DefaultSeo} from 'next-seo';
import Script from 'next/script';
import {Funnel_Display, Funnel_Sans, JetBrains_Mono} from 'next/font/google';
import {MotionConfig} from 'framer-motion';

const display = Funnel_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const body = Funnel_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

/**
 * Main app component
 * @param props Props
 * @param props.Component App component
 * @param props.pageProps
 */
function App({Component, pageProps}: AppProps) {
  const router = useRouter();
  const pathname = (router.asPath.split('?')[0] ?? '').split('#')[0] ?? '/';
  const markdownHref = hasMarkdownVariant(pathname) ? `${pathname === '/' ? '/index' : pathname}.md` : null;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const message = searchParams.get('message');

    if (message) {
      toast(message, {duration: 10000});
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <Head>
          <title>Plunk | The Open-Source Email Platform</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" key={'viewport'} />
          {markdownHref && <link rel="alternate" type="text/markdown" href={markdownHref} />}
        </Head>
        <Toaster position={'top-right'} />

        <Component {...pageProps} />
      </div>
    </MotionConfig>
  );
}

/**
 * Main app root component that houses all components
 * @param props Default nextjs props
 */
export default function WithProviders(props: AppProps) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => network.fetch('GET', url),
        revalidateOnFocus: true,
      }}
    >
      <DefaultSeo
        defaultTitle={'Plunk | The Open-Source Email Platform'}
        title={'Plunk | The Open-Source Email Platform'}
        description={
          'Open-source email automation platform with workflows, segments, and developer API. Scale from 0 to millions of emails at $0.001 per email. Self-hostable and privacy-first.'
        }
        twitter={{cardType: 'summary_large_image', handle: '@useplunk', site: '@useplunk'}}
        openGraph={{
          title: 'Plunk | The Open-Source Email Platform',
          description:
            'Open-source email automation platform with workflows, segments, and developer API. Scale from 0 to millions of emails at $0.001 per email. Self-hostable and privacy-first.',
          images: [
            {
              url: `https://www.useplunk.com/api/og?title=${encodeURIComponent('The Open-Source Email Platform')}`,
              width: 1200,
              height: 630,
              alt: 'Plunk',
            },
          ],
        }}
        additionalMetaTags={[{property: 'title', content: 'Plunk | The Open-Source Email Platform'}]}
      />

      <Script
        defer
        src="https://analytics.driaug.com/script.js"
        data-website-id="6ed9fa6c-3a75-4926-ad4d-f607557f79f1"
        data-domains="www.useplunk.com"
      />

      <App {...props} />
    </SWRConfig>
  );
}
