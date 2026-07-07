import React from 'react';

import styles from './marquee.module.css';
import {Marquee} from './Marquee';
import {createDefaultMarqueeCards} from './defaults';
import {normalizeMarqueeDisplayFields} from './display';
import {ReviewCard} from './ReviewCard';
import type {MarqueeDisplayOptions, MarqueePuckProps} from './types';

export function PuckMarqueeBlock({
  cards,
  showAvatar,
  showName,
  showUsername,
  showReview,
  dualRow = true,
  showFadeEdges = true,
  pauseOnHover = true,
  duration = 20,
}: MarqueePuckProps) {
  const display = normalizeMarqueeDisplayFields({
    showAvatar,
    showName,
    showUsername,
    showReview,
  });
  const items = cards?.length > 0 ? cards : createDefaultMarqueeCards();
  const midpoint = Math.ceil(items.length / 2);
  const firstRow = items.slice(0, midpoint);
  const secondRow = items.slice(midpoint);
  const marqueeStyle = {
    '--duration': `${duration}s`,
    '--gap': 'var(--puck-marquee-gap)',
  } as React.CSSProperties;
  const cardProps: MarqueeDisplayOptions = display;

  return (
    <div className={styles.block}>
      {dualRow ? (
        <>
          <Marquee pauseOnHover={pauseOnHover} style={marqueeStyle}>
            {firstRow.map((review, index) => (
              <ReviewCard key={`row1-${index}`} {...review} {...cardProps} />
            ))}
          </Marquee>
          {secondRow.length > 0 ? (
            <Marquee reverse pauseOnHover={pauseOnHover} style={marqueeStyle}>
              {secondRow.map((review, index) => (
                <ReviewCard key={`row2-${index}`} {...review} {...cardProps} />
              ))}
            </Marquee>
          ) : null}
        </>
      ) : (
        <Marquee pauseOnHover={pauseOnHover} style={marqueeStyle}>
          {items.map((review, index) => (
            <ReviewCard key={`row-${index}`} {...review} {...cardProps} />
          ))}
        </Marquee>
      )}

      {showFadeEdges ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background to-transparent" />
        </>
      ) : null}
    </div>
  );
}
