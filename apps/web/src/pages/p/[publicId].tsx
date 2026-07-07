import '@puckeditor/core/puck.css';

import type {Data} from '@puckeditor/core';
import {Render} from '@puckeditor/core';
import {IconSpinner} from '@plunk/ui';
import type {PublicLandingPageConfig} from '@plunk/types';
import Head from 'next/head';
import {useRouter} from 'next/router';
import {useEffect, useState} from 'react';

import {puckConfig} from '../../lib/puck/config';
import {normalizePuckData} from '../../lib/puck/normalize-data';
import {network} from '../../lib/network';

export default function PublicLandingPage() {
  const router = useRouter();
  const {publicId} = router.query;

  const [config, setConfig] = useState<PublicLandingPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !publicId || typeof publicId !== 'string') return;

    const fetchPage = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await network.fetch<PublicLandingPageConfig>('GET', `/landing-pages/public/${publicId}`);
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load landing page');
      } finally {
        setLoading(false);
      }
    };

    void fetchPage();
  }, [publicId, router.isReady]);

  if (!router.isReady || (loading && !config)) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <IconSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-lg w-full rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900">Page not found</h1>
          <p className="text-neutral-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!config) return null;

  const pageTitle = config.settings.title || config.name;
  const pageDescription = config.settings.description;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        {pageDescription ? <meta name="description" content={pageDescription} /> : null}
        {config.settings.faviconUrl ? <link rel="icon" href={config.settings.faviconUrl} /> : null}
      </Head>
      <Render config={puckConfig} data={normalizePuckData(config.data) as Data} />
    </>
  );
}
