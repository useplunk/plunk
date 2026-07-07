export interface SpectaTestimonialItem {
  name: string;
  text: string;
  handle: string;
  imageSrc: string;
  featured: boolean;
}

export interface SpectaTestimonialsProps {
  title: string;
  description: string;
  testimonials: SpectaTestimonialItem[];
  readMoreSize: 'sm' | 'md' | 'lg';
  withBackground: boolean;
  withBackgroundGlow: boolean;
  sectionId: string;
}
