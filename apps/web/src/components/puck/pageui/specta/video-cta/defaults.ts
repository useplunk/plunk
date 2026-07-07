import {cloneAvatars} from '../shared-defaults';
import type {SpectaVideoCtaProps} from './types';

export function createDefaultSpectaVideoCta(): SpectaVideoCtaProps {
  return {
    eyebrow: 'Video Editing and Shorts made Easy',
    title: 'Create & edit stunning videos with AI',
    description:
      'Specta is a revolutionary AI-powered video editing tool that automates the entire video creation process, making it easy to produce professional videos. With no skills required.',
    videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
    autoPlay: true,
    controls: false,
    withBackground: true,
    showPrimaryCta: true,
    primaryCtaLabel: 'Start free today',
    primaryCtaHref: '#',
    showSocialProof: true,
    showSocialProofRating: true,
    showSocialProofAvatars: true,
    numberOfUsers: 25000,
    suffixText: 'happy editors',
    avatars: cloneAvatars(),
    sectionId: '',
  };
}
