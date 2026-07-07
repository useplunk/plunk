export interface GnomieVideoFeatureItem {
  title: string;
  description: string;
  videoSrc: string;
  autoPlay: boolean;
}

export interface GnomieFeaturesGridProps {
  title: string;
  description: string;
  withBackground: boolean;
  features: GnomieVideoFeatureItem[];
  sectionId: string;
}
