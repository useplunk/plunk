import '@puckeditor/core/puck.css';

import type {Data} from '@puckeditor/core';
import {Render} from '@puckeditor/core';
import type {PublicLandingPageConfig} from '@plunk/types';
import type {GetServerSideProps} from 'next';

import {LandingPagePublicHead} from '../../components/LandingPagePublicHead';
import {API_URI, DASHBOARD_URI} from '../../lib/constants';
import {puckConfig} from '../../lib/puck/config';
import {normalizePuckData} from '../../lib/puck/normalize-data';

interface PublicLandingPageProps {
  config: PublicLandingPageConfig;
}

export default function PublicLandingPage({config}: PublicLandingPageProps) {
  const pageUrl = `${DASHBOARD_URI}/p/${config.publicId}`;

  return (
    <>
      <LandingPagePublicHead
        name={config.name}
        publicId={config.publicId}
        pageUrl={pageUrl}
        settings={config.settings}
      />
      <Render config={puckConfig} data={normalizePuckData(config.data) as Data} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PublicLandingPageProps> = async ctx => {
  const publicId = ctx.params?.publicId;
  if (!publicId || typeof publicId !== 'string') {
    return {notFound: true};
  }

  try {
    const response = await fetch(`${API_URI}/landing-pages/public/${encodeURIComponent(publicId)}`);

    if (response.status === 404) {
      return {notFound: true};
    }

    if (!response.ok) {
      throw new Error(`Failed to load landing page (${response.status})`);
    }

    const config = (await response.json()) as PublicLandingPageConfig;

    ctx.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    return {props: {config}};
  } catch {
    return {notFound: true};
  }
};
