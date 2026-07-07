import {cloneTestimonials} from '../shared-defaults';
import type {PageUiTestimonialsProps} from './types';

export function createDefaultTestimonials(): PageUiTestimonialsProps {
  return {
    title: "Don't take it from us",
    description: 'See what 120k developers have to say about this product.',
    testimonials: cloneTestimonials(),
    readMoreSize: 'md',
    sectionId: '',
  };
}
