import type {ComponentConfig} from '@puckeditor/core';

import {sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomieProductTourDesigns} from './defaults';
import {PuckGnomieProductTourBlock} from './PuckGnomieProductTourBlock';
import type {GnomieProductTourProps} from './types';

export const gnomieProductTourPuckComponent: ComponentConfig<GnomieProductTourProps> = {
  label: 'Gnomie Product Tour',
  defaultProps: createDefaultGnomieProductTourDesigns(),
  fields: {
    title: {type: 'textarea', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    descriptionSecondary: {type: 'textarea', label: 'Secondary description', contentEditable: true},
    defaultTab: {type: 'text', label: 'Default tab ID'},
    items: {
      type: 'array',
      label: 'Tour items',
      getItemSummary: (item: GnomieProductTourProps['items'][number]) => item.title || 'Item',
      defaultItemProps: {
        id: 'feature-new',
        title: 'New feature',
        description: 'Feature description',
        videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
      },
      arrayFields: {
        id: {type: 'text', label: 'Tab ID'},
        title: {type: 'text', label: 'Title'},
        description: {type: 'textarea', label: 'Description'},
        videoSrc: {type: 'text', label: 'Video URL'},
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckGnomieProductTourBlock {...props} />,
};
