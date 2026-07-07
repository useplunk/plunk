import {cloneFeaturesGridItems} from '../shared-defaults';
import type {PageUiFeaturesGridProps} from './types';

export function createDefaultFeaturesGrid(): PageUiFeaturesGridProps {
  return {
    title: 'Explore our courses',
    description:
      'Dive deep into coding with our interactive projects, honing your skills through hands-on experience.',
    items: cloneFeaturesGridItems(),
    sectionId: '',
  };
}
