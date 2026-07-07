import type {ComponentConfig, Fields} from '@puckeditor/core';

import {PAGEUI_PLACEHOLDER_800x600} from '../shared-defaults';
import {sectionIdField} from '../shared-fields';
import {createDefaultFeaturesGrid} from './defaults';
import {PuckFeaturesGridBlock} from './PuckFeaturesGridBlock';
import type {PageUiFeaturesGridProps} from './types';

function buildFields(): Fields<PageUiFeaturesGridProps> {
  return {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    items: {
      type: 'array',
      label: 'Features',
      getItemSummary: (item: PageUiFeaturesGridProps['items'][number]) => item.title || 'Feature',
      defaultItemProps: {
        type: 'image',
        title: 'New feature',
        description: 'Description',
        imageSrc: PAGEUI_PLACEHOLDER_800x600,
        videoSrc: '',
        autoPlay: false,
      },
      arrayFields: {
        type: {
          type: 'select',
          label: 'Type',
          options: [
            {label: 'Image', value: 'image'},
            {label: 'Video', value: 'video'},
          ],
        },
        title: {type: 'text', label: 'Title'},
        description: {type: 'textarea', label: 'Description'},
        imageSrc: {type: 'text', label: 'Image URL'},
        videoSrc: {type: 'text', label: 'Video URL'},
        autoPlay: {
          type: 'radio',
          label: 'Autoplay',
          options: [
            {label: 'Yes', value: true},
            {label: 'No', value: false},
          ],
        },
      },
    },
    sectionId: sectionIdField,
  };
}

const defaults = createDefaultFeaturesGrid();

export const pageUiFeaturesGridPuckComponent: ComponentConfig<PageUiFeaturesGridProps> = {
  label: 'Features Grid',
  defaultProps: defaults,
  fields: buildFields(),
  render: props => <PuckFeaturesGridBlock {...props} />,
};
