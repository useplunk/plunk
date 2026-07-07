import {cloneSpectaTestimonialInlineItems} from '../shared-defaults';
import type {SpectaTestimonialInlineProps} from './types';

export function createDefaultSpectaTestimonialInline(): SpectaTestimonialInlineProps {
  return {
    items: cloneSpectaTestimonialInlineItems(),
    withBackground: false,
    sectionId: '',
  };
}
