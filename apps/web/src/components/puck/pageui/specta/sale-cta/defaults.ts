import {cloneAvatars} from '../shared-defaults';
import type {SpectaSaleCtaProps} from './types';

export function createDefaultSpectaSaleCta(): SpectaSaleCtaProps {
  return {
    eyebrow: 'It takes 1 minute',
    title: 'The faster, easier way to create videos',
    description:
      'Jump in today and see how easy it is to create stunning videos with Snappy.',
    showCta: true,
    ctaHref: '#',
    ctaLabel: 'Sign up now',
    showSocialProof: true,
    showSocialProofRating: true,
    showSocialProofAvatars: true,
    numberOfUsers: 25000,
    suffixText: 'happy users',
    socialProofFooter: 'loved by 25,000+ editors',
    avatars: cloneAvatars(),
    withBackground: true,
    withBackgroundGlow: true,
    sectionId: '',
  };
}
