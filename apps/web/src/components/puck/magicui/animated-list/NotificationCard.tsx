import {cn} from '@plunk/ui';

import styles from './animated-list.module.css';
import type {AnimatedListDisplayOptions, AnimatedListItem} from './types';

type NotificationCardProps = AnimatedListItem &
  AnimatedListDisplayOptions & {
    itemMaxWidth: number;
  };

export function NotificationCard({
  name,
  description,
  icon,
  color,
  time,
  showIcon,
  showName,
  showDescription,
  showTime,
  itemMaxWidth,
}: NotificationCardProps) {
  const hasHeader = showName || showTime;

  return (
    <figure
      className={cn(
        styles.card,
        'relative mx-auto min-h-fit w-full cursor-pointer overflow-hidden rounded-2xl p-4',
        'transition-all duration-200 ease-in-out hover:scale-[103%]',
        'bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]',
        'transform-gpu dark:bg-transparent dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]',
      )}
      style={{maxWidth: itemMaxWidth}}
    >
      <div className="flex flex-row items-center gap-3">
        {showIcon ? (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
            style={{backgroundColor: color}}
          >
            <span className="text-lg">{icon}</span>
          </div>
        ) : null}
        {hasHeader || showDescription ? (
          <div className="flex min-w-0 flex-col overflow-hidden">
            {hasHeader ? (
              <figcaption className="flex flex-row items-center text-lg font-medium whitespace-pre dark:text-white">
                {showName ? <span className="text-sm sm:text-lg">{name}</span> : null}
                {showName && showTime ? <span className="mx-1">·</span> : null}
                {showTime ? <span className="text-xs text-gray-500">{time}</span> : null}
              </figcaption>
            ) : null}
            {showDescription ? (
              <p className="text-sm font-normal dark:text-white/60">{description}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </figure>
  );
}
