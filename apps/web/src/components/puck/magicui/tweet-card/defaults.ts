import type {TweetCardPuckProps} from './types';

const DEFAULT_TWEET_ID = '1668408059125702661';

export function createDefaultTweetCard(): TweetCardPuckProps {
  return {
    tweetId: DEFAULT_TWEET_ID,
    align: 'center',
    showHeader: true,
    showBody: true,
    showMedia: true,
  };
}

export {DEFAULT_TWEET_ID};
