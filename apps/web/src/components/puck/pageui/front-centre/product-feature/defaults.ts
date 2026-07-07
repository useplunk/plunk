import {cloneKeyPoints, PAGEUI_PLACEHOLDER_1000x800} from '../shared-defaults';
import type {PageUiProductFeatureProps} from './types';

export function createDefaultProductFeature(): PageUiProductFeatureProps {
  return {
    title: 'Streamlined Learning Paths',
    showKeyPoints: true,
    keyPoints: cloneKeyPoints(),
    showCta: true,
    ctaLabel: 'Get started free',
    ctaHref: '#',
    showCtaNote: true,
    ctaNote: 'No credit card required.',
    showImage: true,
    imageSrc: PAGEUI_PLACEHOLDER_1000x800,
    imageAlt: 'Screenshot of the product',
    imagePosition: 'left',
    imagePerspective: 'bottom',
    sectionId: '',
  };
}
