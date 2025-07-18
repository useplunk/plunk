import {Tabs} from '../Tabs';
import React from 'react';
import {useRouter} from 'next/router';

/**
 *
 */
export default function DeveloperTabs() {
  const router = useRouter();

  const links = [{to: '/developers/webhooks', text: 'Webhooks', active: router.route === '/developers/webhooks'}];

  return <Tabs links={links} />;
}
