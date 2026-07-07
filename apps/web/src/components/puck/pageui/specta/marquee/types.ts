export interface SpectaMarqueeItem {
  imageSrc: string;
  alt: string;
}

export interface SpectaMarqueeProps {
  withBackground: boolean;
  animationDurationInSeconds: number;
  animationDirection: 'left' | 'right';
  items: SpectaMarqueeItem[];
  sectionId: string;
}
