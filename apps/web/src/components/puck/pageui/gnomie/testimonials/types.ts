export interface GnomieTestimonialItem {
  name: string;
  text: string;
  handle: string;
  imageSrc: string;
  featured: boolean;
}

export interface GnomieTestimonialsProps {
  title: string;
  description: string;
  readMoreSize: 'sm' | 'md' | 'lg';
  testimonials: GnomieTestimonialItem[];
  sectionId: string;
}
