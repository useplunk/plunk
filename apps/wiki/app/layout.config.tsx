import type {BaseLayoutProps} from 'fumadocs-ui/layouts/shared';
import {AppWindowIcon, GithubIcon, GlobeIcon, MessageSquareShareIcon} from 'lucide-react';
import Image from 'next/image';
import React from 'react';

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: BaseLayoutProps = {
  themeSwitch: {
    enabled: false,
  },
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <Image src="/assets/logo.png" alt="Plunk" width={24} height={24} className="rounded" />
        <span>Plunk</span>
      </div>
    ),
  },
  links: [
    {
      icon: <GlobeIcon />,
      text: 'Website',
      url: 'https://www.useplunk.com',
    },
    {
      icon: <AppWindowIcon />,
      text: 'Dashboard',
      url: 'https://next-app.useplunk.com',
    },
    {
      icon: <GithubIcon />,
      text: 'GitHub',
      url: 'https://github.com/useplunk/plunk',
    },
    {
      icon: <MessageSquareShareIcon />,
      text: 'Discord',
      url: 'https://useplunk.com/discord',
    },
  ],
};
