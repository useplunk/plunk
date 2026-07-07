import type {ReactNode} from 'react';

export interface GnomieProductTourItem {
  id: string;
  title: string;
  description: string;
  videoSrc: string;
}

export interface GnomieProductTourProps {
  title: string | ReactNode;
  description: string | ReactNode;
  descriptionSecondary: string | ReactNode;
  defaultTab: string;
  items: GnomieProductTourItem[];
  sectionId: string;
}
