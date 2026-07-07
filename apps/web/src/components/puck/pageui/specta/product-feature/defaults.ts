import {
  cloneSpectaKeyPointsCreate,
  cloneSpectaKeyPointsManage,
  SPECTA_PLACEHOLDER_BACKDROP,
} from '../shared-defaults';
import type {SpectaProductFeatureProps} from './types';

export function createDefaultSpectaProductFeatureCreate(): SpectaProductFeatureProps {
  return {
    eyebrow: 'Create',
    title: 'Specta users create 10x as many videos, at half the cost',
    description:
      "Design eye-catching video content with intuitive editing tools you can use anywhere. Invite collaborators, add effects, and share your videos with ease. With Snappy, you'll double your video output.",
    showKeyPoints: true,
    keyPoints: cloneSpectaKeyPointsCreate(),
    showCta: true,
    ctaLabel: 'Sign up for free',
    ctaHref: '#',
    showCtaNote: true,
    ctaNote: '1000 free videos included.',
    imageSrc: SPECTA_PLACEHOLDER_BACKDROP,
    imageAlt: 'Screenshot of the product',
    imagePosition: 'right',
    sectionId: '',
  };
}

export function createDefaultSpectaProductFeatureManage(): SpectaProductFeatureProps {
  return {
    eyebrow: 'Manage',
    title: 'All your videos in one place',
    description:
      'No more chaos. One centralized location to manage every video project, whether you have 1 video or 100. Plus, invite your whole team to add, edit, and share content.',
    showKeyPoints: true,
    keyPoints: cloneSpectaKeyPointsManage(),
    showCta: true,
    ctaLabel: 'Sign up for free',
    ctaHref: '#',
    showCtaNote: false,
    ctaNote: '',
    imageSrc: SPECTA_PLACEHOLDER_BACKDROP,
    imageAlt: 'Screenshot of the product',
    imagePosition: 'left',
    sectionId: '',
  };
}
