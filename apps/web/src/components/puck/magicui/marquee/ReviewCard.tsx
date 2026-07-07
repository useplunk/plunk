import {cn} from '@plunk/ui';

import type {MarqueeDisplayOptions, MarqueeReviewCard} from './types';

type ReviewCardProps = MarqueeReviewCard & MarqueeDisplayOptions;

export function ReviewCard({
  img,
  name,
  username,
  body,
  showAvatar,
  showName,
  showUsername,
  showReview,
}: ReviewCardProps) {
  const hasHeader = showAvatar || showName || showUsername;

  return (
    <figure
      className={cn(
        'relative h-full w-64 shrink-0 overflow-hidden rounded-xl border p-4',
        'border-neutral-950/10 bg-neutral-950/[0.01]',
        'dark:border-neutral-50/10 dark:bg-neutral-50/10',
      )}
    >
      {hasHeader ? (
        <div className="flex flex-row items-center gap-2">
          {showAvatar && img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="rounded-full" width={32} height={32} alt="" src={img} />
          ) : null}
          {showName || showUsername ? (
            <div className="flex flex-col">
              {showName ? (
                <figcaption className="text-sm font-medium dark:text-white">{name}</figcaption>
              ) : null}
              {showUsername ? (
                <p className="text-xs font-medium text-neutral-500 dark:text-white/40">{username}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {showReview ? (
        <blockquote
          className={cn(
            'text-sm text-neutral-700 dark:text-neutral-200',
            hasHeader ? 'mt-2' : undefined,
          )}
        >
          {body}
        </blockquote>
      ) : null}
    </figure>
  );
}
