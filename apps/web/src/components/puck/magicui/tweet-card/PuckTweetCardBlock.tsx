import React from 'react';

import {ClientTweetCard} from './ClientTweetCard';
import {normalizeTweetCardDisplayFields, normalizeTweetId} from './display';
import styles from './tweet-card.module.css';
import type {TweetCardPuckProps} from './types';

const alignClass = {
  left: styles.alignLeft ?? '',
  center: styles.alignCenter ?? '',
  right: styles.alignRight ?? '',
} as const;

export function PuckTweetCardBlock({
  tweetId,
  align = 'center',
  showHeader = true,
  showBody = true,
  showMedia = true,
}: TweetCardPuckProps) {
  const display = normalizeTweetCardDisplayFields({
    showHeader,
    showBody,
    showMedia,
  });
  const normalizedId = normalizeTweetId(tweetId);

  return (
    <div className={styles.block}>
      <div className={`${styles.inner} ${alignClass[align]}`}>
        <ClientTweetCard id={normalizedId} {...display} />
      </div>
    </div>
  );
}
