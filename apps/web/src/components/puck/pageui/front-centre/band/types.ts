export type BandIcon = 'chrome' | 'figma' | 'github' | 'framer';

export interface BandIconItem {
  icon: BandIcon;
}

export interface PageUiBandProps {
  title: string;
  description: string;
  showIcons: boolean;
  icons: BandIconItem[];
  sectionId: string;
}
