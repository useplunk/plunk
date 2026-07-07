export type HeroVideoAnimationStyle =
  | 'from-bottom'
  | 'from-center'
  | 'from-top'
  | 'from-left'
  | 'from-right'
  | 'fade'
  | 'top-in-bottom-out'
  | 'left-in-right-out';

export interface HeroVideoDialogPuckProps {
  videoSrc: string;
  thumbnailSrc: string;
  thumbnailAlt: string;
  animationStyle: HeroVideoAnimationStyle;
  dualTheme: boolean;
  thumbnailSrcDark: string;
  align: 'left' | 'center' | 'right';
  rounded: boolean;
}
