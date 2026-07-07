export interface TestimonialItem {
  name: string;
  text: string;
  handle: string;
  imageSrc: string;
  featured: boolean;
}

export interface PageUiTestimonialsProps {
  title: string;
  description: string;
  testimonials: TestimonialItem[];
  readMoreSize: 'sm' | 'md' | 'lg';
  sectionId: string;
}
