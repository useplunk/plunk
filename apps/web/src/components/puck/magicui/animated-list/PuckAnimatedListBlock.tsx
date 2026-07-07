import React from 'react';

import styles from './animated-list.module.css';
import {AnimatedList} from './AnimatedList';
import {createDefaultAnimatedList} from './defaults';
import {normalizeAnimatedListDisplayFields} from './display';
import {NotificationCard} from './NotificationCard';
import type {AnimatedListPuckProps} from './types';

export function PuckAnimatedListBlock({
  items,
  showIcon,
  showName,
  showDescription,
  showTime,
  delay = 1000,
  containerHeight = 500,
  itemMaxWidth = 400,
  showBottomFade = true,
  repeatCycles = 1,
  gap = 1,
}: AnimatedListPuckProps) {
  const display = normalizeAnimatedListDisplayFields({
    showIcon,
    showName,
    showDescription,
    showTime,
  });
  const source = items?.length > 0 ? items : createDefaultAnimatedList();
  const expanded =
    repeatCycles > 1
      ? Array.from({length: repeatCycles}, () => source).flat()
      : source;

  const blockStyle = {
    height: containerHeight,
    '--gap': `${gap}rem`,
  } as React.CSSProperties;

  return (
    <div className={styles.block} style={blockStyle}>
      <AnimatedList delay={delay} className={styles.list}>
        {expanded.map((item, index) => (
          <NotificationCard
            key={`notification-${index}`}
            {...item}
            {...display}
            itemMaxWidth={itemMaxWidth}
          />
        ))}
      </AnimatedList>

      {showBottomFade ? <div className={styles.bottomFade} /> : null}
    </div>
  );
}
