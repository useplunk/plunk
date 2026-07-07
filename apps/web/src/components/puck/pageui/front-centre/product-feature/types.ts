export interface KeyPointItem {
  title: string;
  description: string;
}

export interface PageUiProductFeatureProps {
  title: string;
  showKeyPoints: boolean;
  keyPoints: KeyPointItem[];
  showCta: boolean;
  ctaLabel: string;
  ctaHref: string;
  showCtaNote: boolean;
  ctaNote: string;
  showImage: boolean;
  imageSrc: string;
  imageAlt: string;
  imagePosition: 'left' | 'right' | 'center';
  imagePerspective: 'none' | 'left' | 'right' | 'bottom' | 'bottom-lg' | 'paper';
  sectionId: string;
}
