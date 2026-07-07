import {cloneGnomieAvatars} from '../shared-defaults';
import type {GnomieSaleCtaProps} from './types';

export function createDefaultGnomieSaleCta(): GnomieSaleCtaProps {
  return {
    title: 'Transform Your Garden Today',
    description:
      'Join thousands of gardeners who are reimagining their outdoor spaces with Gnomie. From planning to planting, we’re here to help every step of the way.',
    showCta: true,
    ctaHref: '#',
    ctaLabel: 'Get started in minutes',
    showSocialProof: true,
    showSocialProofRating: true,
    showSocialProofAvatars: true,
    numberOfUsers: 110000,
    suffixText: 'happy gardeners',
    avatars: cloneGnomieAvatars(),
    sectionId: '',
  };
}
