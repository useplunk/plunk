'use client';

import {useTweet} from 'react-tweet';

import {MagicTweet, TweetNotFound, TweetSkeleton} from './MagicTweet';
import type {TweetCardDisplayOptions} from './types';

export interface ClientTweetCardProps extends TweetCardDisplayOptions {
  id: string;
  className?: string;
}

export const ClientTweetCard = ({
  id,
  className,
  showHeader = true,
  showBody = true,
  showMedia = true,
}: ClientTweetCardProps) => {
  const {data, error, isLoading} = useTweet(id);

  if (isLoading) {
    return <TweetSkeleton className={className} />;
  }

  if (error || !data) {
    return <TweetNotFound className={className} />;
  }

  return (
    <MagicTweet
      tweet={data}
      className={className}
      showHeader={showHeader}
      showBody={showBody}
      showMedia={showMedia}
    />
  );
};
