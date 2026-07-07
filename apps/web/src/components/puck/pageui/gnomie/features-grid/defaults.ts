import {cloneGnomieVideoFeatures} from '../shared-defaults';
import type {GnomieFeaturesGridProps} from './types';

export function createDefaultGnomieFeaturesGrid(): GnomieFeaturesGridProps {
  return {
    title: 'Your garden, reimagined',
    description:
      "See how Gnomie AI completely transformed our customers' gardens, making them more beautiful and easier to maintain.",
    withBackground: false,
    features: cloneGnomieVideoFeatures().map(item => ({...item, autoPlay: false})),
    sectionId: '',
  };
}
