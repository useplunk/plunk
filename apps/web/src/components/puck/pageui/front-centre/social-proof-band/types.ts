export type SocialProofBandGraphic = 'gift' | 'checkmark' | 'trophy' | 'magic' | 'zap' | 'rocket' | 'time' | 'rating' | 'none';

export interface PageUiSocialProofBandProps {
  text: string;
  graphic: SocialProofBandGraphic;
  invert: boolean;
  hiddenOnMobile: boolean;
  sectionId: string;
}
