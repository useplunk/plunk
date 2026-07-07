import type {ComponentConfig} from '@puckeditor/core';

import {SPECTA_PLACEHOLDER_BACKDROP} from '../shared-defaults';
import {sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultSpectaShowcaseMarquee} from './defaults';
import {PuckSpectaShowcaseMarqueeBlock} from './PuckSpectaShowcaseMarqueeBlock';
import type {SpectaShowcaseMarqueeProps} from './types';

const rowArrayFields = {
  animationDurationInSeconds: {
    type: 'number',
    label: 'Animation duration (seconds)',
    min: 1,
  },
  animationDirection: {
    type: 'select',
    label: 'Animation direction',
    options: [
      {label: 'Right', value: 'right'},
      {label: 'Left', value: 'left'},
    ],
  },
  images: {
    type: 'array',
    label: 'Images',
    getItemSummary: (item: SpectaShowcaseMarqueeProps['topRow']['images'][number]) =>
      item.alt || 'Image',
    defaultItemProps: {imageSrc: SPECTA_PLACEHOLDER_BACKDROP, alt: 'Screenshot'},
    arrayFields: {
      imageSrc: {type: 'text', label: 'Image URL'},
      alt: {type: 'text', label: 'Alt text'},
    },
  },
} as const;

export const spectaShowcaseMarqueePuckComponent: ComponentConfig<SpectaShowcaseMarqueeProps> = {
  label: 'Specta Showcase Marquee',
  defaultProps: createDefaultSpectaShowcaseMarquee(),
  fields: {
    eyebrow: {type: 'text', label: 'Eyebrow', contentEditable: true},
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showcaseClassName: {type: 'text', label: 'Showcase className'},
    topRow: {
      type: 'object',
      label: 'Top marquee row',
      objectFields: rowArrayFields,
    },
    bottomRow: {
      type: 'object',
      label: 'Bottom marquee row',
      objectFields: rowArrayFields,
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckSpectaShowcaseMarqueeBlock {...props} />,
};
