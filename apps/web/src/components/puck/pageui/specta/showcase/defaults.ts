import {cloneSpectaShowcaseItems} from '../shared-defaults';
import type {SpectaShowcaseProps} from './types';

export function createDefaultSpectaShowcase(): SpectaShowcaseProps {
  return {
    eyebrow: 'Import',
    title: 'Add footage from anywhere',
    description:
      'All your video assets in one place. Import your existing footage from any device or platform.',
    className: 'mt-8',
    items: cloneSpectaShowcaseItems(),
    sectionId: '',
  };
}
