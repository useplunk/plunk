import React from 'react';

import styles from './hero-video-dialog.module.css';
import {HeroVideoDialog} from './HeroVideoDialog';
import type {HeroVideoDialogPuckProps} from './types';

const alignClass = {
  left: styles.alignLeft ?? '',
  center: styles.alignCenter ?? '',
  right: styles.alignRight ?? '',
} as const;

export function PuckHeroVideoDialogBlock({
  videoSrc,
  thumbnailSrc,
  thumbnailAlt,
  animationStyle,
  dualTheme = false,
  thumbnailSrcDark = '',
  align = 'center',
  rounded = true,
}: HeroVideoDialogPuckProps) {
  const sharedProps = {
    animationStyle,
    videoSrc,
    thumbnailAlt,
    rounded,
  };

  return (
    <div className={styles.block}>
      <div className={`${styles.inner} ${alignClass[align]}`}>
        {dualTheme && thumbnailSrcDark ? (
          <div className="relative">
            <HeroVideoDialog
              {...sharedProps}
              className="block dark:hidden"
              thumbnailSrc={thumbnailSrc}
            />
            <HeroVideoDialog
              {...sharedProps}
              className="hidden dark:block"
              thumbnailSrc={thumbnailSrcDark}
            />
          </div>
        ) : (
          <HeroVideoDialog {...sharedProps} thumbnailSrc={thumbnailSrc} />
        )}
      </div>
    </div>
  );
}
