import * as React from 'react';

import {cn} from '@plunk/ui';

import styles from './marquee.module.css';

interface MarqueeProps extends React.ComponentPropsWithoutRef<'div'> {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  style,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      style={style}
      className={cn(styles.marquee, vertical && styles.marqueeVertical, pauseOnHover && styles.pauseOnHover, className)}
    >
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn(
              styles.track,
              vertical && styles.trackVertical,
              reverse && styles.trackReverse,
            )}
          >
            {children}
          </div>
        ))}
    </div>
  );
}

export type {MarqueeProps};
