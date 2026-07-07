import {cloneAvatars} from '../shared-defaults';
import type {PageUiVideoCtaProps} from './types';

export function createDefaultVideoCta(): PageUiVideoCtaProps {
  return {
    title: 'Time to level up ↑ your front-end skills',
    description:
      'Elevate your development game and achieve more with our awesome front-end learning center. It\'s dynamic, beginner-friendly, and designed with you in mind!',
    videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
    autoPlay: true,
    controls: false,
    variant: 'secondary',
    withBackground: true,
    showPrimaryCta: true,
    primaryCtaLabel: 'Get started',
    primaryCtaHref: '#',
    showSecondaryCta: true,
    secondaryCtaLabel: 'Learn More',
    secondaryCtaHref: '#',
    showDiscount: true,
    showDiscountIcon: true,
    discountValueText: '$50 off',
    discountDescriptionText: 'for the first 20 customers (5 left)',
    showSocialProof: true,
    showSocialProofRating: true,
    showSocialProofAvatars: true,
    numberOfUsers: 12000,
    suffixText: 'happy users',
    avatars: cloneAvatars(),
    sectionId: '',
  };
}
