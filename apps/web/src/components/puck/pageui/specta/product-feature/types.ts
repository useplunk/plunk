export interface SpectaKeyPointItem {
  title: string;
  description: string;
}

export interface SpectaProductFeatureProps {
  eyebrow: string;
  title: string;
  description: string;
  showKeyPoints: boolean;
  keyPoints: SpectaKeyPointItem[];
  showCta: boolean;
  ctaLabel: string;
  ctaHref: string;
  showCtaNote: boolean;
  ctaNote: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
  sectionId: string;
}
