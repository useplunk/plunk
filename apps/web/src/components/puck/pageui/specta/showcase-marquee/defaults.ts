import {cloneSpectaShowcaseMarqueeImages} from '../shared-defaults';
import type {SpectaShowcaseMarqueeProps} from './types';

export function createDefaultSpectaShowcaseMarquee(): SpectaShowcaseMarqueeProps {
  return {
    eyebrow: 'Monetize',
    title: 'Insert ads and earn money',
    description:
      'Easily monetize your videos with our built-in tools. No need for a third-party service.',
    showcaseClassName: '-mb-12',
    topRow: {
      animationDurationInSeconds: 100,
      animationDirection: 'right',
      images: cloneSpectaShowcaseMarqueeImages(4),
    },
    bottomRow: {
      animationDurationInSeconds: 110,
      animationDirection: 'left',
      images: cloneSpectaShowcaseMarqueeImages(3),
    },
    sectionId: '',
  };
}
