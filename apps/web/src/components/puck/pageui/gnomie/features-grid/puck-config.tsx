import type {ComponentConfig} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomieFeaturesGrid} from './defaults';
import {PuckGnomieFeaturesGridBlock} from './PuckGnomieFeaturesGridBlock';
import type {GnomieFeaturesGridProps} from './types';

export const gnomieFeaturesGridPuckComponent: ComponentConfig<GnomieFeaturesGridProps> = {
  label: 'Gnomie Features Grid',
  defaultProps: createDefaultGnomieFeaturesGrid(),
  fields: {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    withBackground: yesNo('Background'),
    features: {
      type: 'array',
      label: 'Video features',
      getItemSummary: (item: GnomieFeaturesGridProps['features'][number]) => item.title || 'Feature',
      defaultItemProps: {
        title: 'New feature',
        description: 'Feature description',
        videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
        autoPlay: false,
      },
      arrayFields: {
        title: {type: 'text', label: 'Title'},
        description: {type: 'textarea', label: 'Description'},
        videoSrc: {type: 'text', label: 'Video URL'},
        autoPlay: yesNo('Autoplay'),
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckGnomieFeaturesGridBlock {...props} />,
};
