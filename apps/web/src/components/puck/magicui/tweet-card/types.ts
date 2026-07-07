export type TweetCardAlign = 'left' | 'center' | 'right';

export interface TweetCardDisplayOptions {
  showHeader: boolean;
  showBody: boolean;
  showMedia: boolean;
}

export interface TweetCardPuckProps extends TweetCardDisplayOptions {
  tweetId: string;
  align: TweetCardAlign;
}
