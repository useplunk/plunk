import {cloneSpectaTestimonials} from '../shared-defaults';
import type {SpectaTestimonialsProps} from './types';

export function createDefaultSpectaTestimonials(): SpectaTestimonialsProps {
  return {
    title: 'Used by leading companies',
    description:
      '25,000 of the SaaS companies, and freelancers are growing faster with Specta.',
    testimonials: cloneSpectaTestimonials(),
    readMoreSize: 'md',
    withBackground: true,
    withBackgroundGlow: true,
    sectionId: '',
  };
}
