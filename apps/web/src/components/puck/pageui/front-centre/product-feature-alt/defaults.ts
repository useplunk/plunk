import {PAGEUI_PLACEHOLDER_1000x800} from '../shared-defaults';
import type {PageUiProductFeatureAltProps} from './types';

export function createDefaultProductFeatureAlt(): PageUiProductFeatureAltProps {
  return {
    title: 'Interactive Projects',
    description:
      'No tech skills? No problem! Our app lets you create tailor-made solutions effortlessly. Save time and frustration while reaching your development goals.',
    showCta: true,
    ctaLabel: 'Try now for free',
    ctaHref: '#',
    showCtaNote: true,
    ctaNote: 'Get started with our free tier.',
    showImage: true,
    imageSrc: PAGEUI_PLACEHOLDER_1000x800,
    variant: 'secondary',
    withBackground: true,
    withBackgroundGlow: true,
    sectionId: '',
  };
}
