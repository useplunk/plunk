export interface MarqueeReviewCard {
  name: string;
  username: string;
  body: string;
  img: string;
}

export interface MarqueeDisplayOptions {
  showAvatar: boolean;
  showName: boolean;
  showUsername: boolean;
  showReview: boolean;
}

export interface MarqueePuckProps extends MarqueeDisplayOptions {
  cards: MarqueeReviewCard[];
  dualRow: boolean;
  showFadeEdges: boolean;
  pauseOnHover: boolean;
  duration: number;
}
