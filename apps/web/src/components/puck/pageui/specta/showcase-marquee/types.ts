export interface SpectaShowcaseMarqueeImage {
  imageSrc: string;
  alt: string;
}

export interface SpectaShowcaseMarqueeRow {
  animationDurationInSeconds: number;
  animationDirection: 'left' | 'right';
  images: SpectaShowcaseMarqueeImage[];
}

export interface SpectaShowcaseMarqueeProps {
  eyebrow: string;
  title: string;
  description: string;
  showcaseClassName: string;
  topRow: SpectaShowcaseMarqueeRow;
  bottomRow: SpectaShowcaseMarqueeRow;
  sectionId: string;
}
