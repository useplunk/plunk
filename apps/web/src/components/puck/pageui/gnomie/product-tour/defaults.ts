import {
  cloneGnomieProductTourItemsDesigns,
  cloneGnomieProductTourItemsSavings,
} from '../shared-defaults';
import type {GnomieProductTourProps} from './types';

export function createDefaultGnomieProductTourDesigns(): GnomieProductTourProps {
  const items = cloneGnomieProductTourItemsDesigns();
  return {
    title: 'Superb garden designs.\nCreated in minutes.',
    description:
      'Gnomie is an intuitive garden design tool that makes your outdoor space look beautiful.',
    descriptionSecondary:
      "It automatically suggests plants, flowers, and landscaping features based on your region's climate and soil conditions.",
    defaultTab: items[0]?.id ?? 'feature-1',
    items,
    sectionId: '',
  };
}

export function createDefaultGnomieProductTourSavings(): GnomieProductTourProps {
  const items = cloneGnomieProductTourItemsSavings();
  return {
    title: 'Save $1000s on your garden.',
    description:
      'Gnomie is an intuitive garden design tool that makes your outdoor space look beautiful.',
    descriptionSecondary:
      "It automatically suggests plants, flowers, and landscaping features based on your region's climate and soil conditions.",
    defaultTab: items[0]?.id ?? 'feature-1',
    items,
    sectionId: '',
  };
}
