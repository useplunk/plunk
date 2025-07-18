import {Tabs} from '../Tabs';
import React from 'react';
import {useRouter} from 'next/router';

/**
 *
 * @param root0
 * @param root0.onMethodChange
 */
export default function AnalyticsTabs() {
  const router = useRouter();

  const links = [
    {to: '/analytics', text: 'Overview', active: router.route === '/analytics'},
    {to: '/analytics/clicks', text: 'Clicks', active: router.route === '/analytics/clicks'},
  ];

  return <Tabs links={links} />;
}
