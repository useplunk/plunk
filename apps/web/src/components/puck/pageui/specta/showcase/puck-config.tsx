import type {ComponentConfig} from '@puckeditor/core';

import {SPECTA_PLACEHOLDER_LOGO} from '../shared-defaults';
import {sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultSpectaShowcase} from './defaults';
import {PuckSpectaShowcaseBlock} from './PuckSpectaShowcaseBlock';
import type {SpectaShowcaseProps} from './types';

export const spectaShowcasePuckComponent: ComponentConfig<SpectaShowcaseProps> = {
  label: 'Specta Showcase',
  defaultProps: createDefaultSpectaShowcase(),
  fields: {
    eyebrow: {type: 'text', label: 'Eyebrow', contentEditable: true},
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    className: {type: 'text', label: 'Section className'},
    items: {
      type: 'array',
      label: 'Items',
      getItemSummary: (item: SpectaShowcaseProps['items'][number]) => item.alt || 'Item',
      defaultItemProps: {imageSrc: SPECTA_PLACEHOLDER_LOGO, alt: 'Integration'},
      arrayFields: {
        imageSrc: {type: 'text', label: 'Image URL'},
        alt: {type: 'text', label: 'Alt text'},
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckSpectaShowcaseBlock {...props} />,
};
