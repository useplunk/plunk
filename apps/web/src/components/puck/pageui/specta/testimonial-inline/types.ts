export interface SpectaTestimonialInlineItem {
  name: string;
  text: string;
  suffix: string;
  imageSrc: string;
}

export interface SpectaTestimonialInlineProps {
  items: SpectaTestimonialInlineItem[];
  withBackground: boolean;
  sectionId: string;
}
