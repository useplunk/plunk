import {cloneGnomieTestimonials} from '../shared-defaults';
import type {GnomieTestimonialsProps} from './types';

export function createDefaultGnomieTestimonials(): GnomieTestimonialsProps {
  return {
    title: 'Gardeners Love Gnomie',
    description: 'See what our community of 120k gardeners have to say about Gnomie.',
    readMoreSize: 'md',
    testimonials: cloneGnomieTestimonials(),
    sectionId: '',
  };
}
