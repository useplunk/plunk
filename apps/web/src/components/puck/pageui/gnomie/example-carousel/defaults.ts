import {
  cloneGnomieAvatars,
  cloneGnomieExampleCarouselItemsMadeWith,
  cloneGnomieExampleCarouselItemsTransform,
} from '../shared-defaults';
import type {GnomieExampleCarouselProps} from './types';

export function createDefaultGnomieExampleCarouselMadeWith(): GnomieExampleCarouselProps {
  return {
    title: 'Made with Gnomie',
    description:
      'Thousands of people use Gnomie to reimagine their outdoor spaces, adding plants, flowers, and landscaping elements suited to their specific climate.',
    items: cloneGnomieExampleCarouselItemsMadeWith(),
    showHeaderCta: false,
    headerCtaLabel: 'Start free today',
    headerCtaHref: '#',
    showSocialProof: false,
    showSocialProofRating: true,
    showSocialProofAvatars: true,
    numberOfUsers: 110000,
    suffixText: 'happy gardeners',
    avatars: cloneGnomieAvatars(),
    showCtaCard: true,
    ctaLabel: 'Try Gnomie for free',
    ctaHref: '#',
    ctaNote: 'No credit card required',
    ctaNoteSecondary: '',
    sectionId: '',
  };
}

export function createDefaultGnomieExampleCarouselTransform(): GnomieExampleCarouselProps {
  return {
    title: 'Transform Your Space with Gnomie',
    description:
      'Join thousands of satisfied users who have transformed their gardens into beautiful, personalized outdoor retreats.',
    items: cloneGnomieExampleCarouselItemsTransform(),
    showHeaderCta: true,
    headerCtaLabel: 'Start free today',
    headerCtaHref: '#',
    showSocialProof: true,
    showSocialProofRating: true,
    showSocialProofAvatars: true,
    numberOfUsers: 110000,
    suffixText: 'happy gardeners',
    avatars: cloneGnomieAvatars(),
    showCtaCard: true,
    ctaLabel: 'Start Your Garden Today',
    ctaHref: '#',
    ctaNote: 'No credit card required',
    ctaNoteSecondary: 'More tools inside',
    sectionId: '',
  };
}
