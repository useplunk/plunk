export interface FeaturesGridItem {
  type: 'image' | 'video';
  title: string;
  description: string;
  imageSrc: string;
  videoSrc: string;
  autoPlay: boolean;
}

export interface PageUiFeaturesGridProps {
  title: string;
  description: string;
  items: FeaturesGridItem[];
  sectionId: string;
}
