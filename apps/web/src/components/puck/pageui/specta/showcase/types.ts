export interface SpectaShowcaseItem {
  imageSrc: string;
  alt: string;
}

export interface SpectaShowcaseProps {
  eyebrow: string;
  title: string;
  description: string;
  className: string;
  items: SpectaShowcaseItem[];
  sectionId: string;
}
