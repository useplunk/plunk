import type {ComponentConfig} from '@puckeditor/core';

import {SPECTA_PLACEHOLDER_LOGO} from '../shared-defaults';
import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultSpectaMarquee} from './defaults';
import {PuckSpectaMarqueeBlock} from './PuckSpectaMarqueeBlock';
import type {SpectaMarqueeProps} from './types';

export const spectaMarqueePuckComponent: ComponentConfig<SpectaMarqueeProps> = {
  label: 'Specta Marquee',
  defaultProps: createDefaultSpectaMarquee(),
  fields: {
    withBackground: yesNo('Background'),
    animationDurationInSeconds: {
      type: 'number',
      label: 'Animation duration (seconds, 0 = auto)',
      min: 0,
    },
    animationDirection: {
      type: 'select',
      label: 'Animation direction',
      options: [
        {label: 'Right', value: 'right'},
        {label: 'Left', value: 'left'},
      ],
    },
    items: {
      type: 'array',
      label: 'Logos',
      getItemSummary: (item: SpectaMarqueeProps['items'][number]) => item.alt || 'Logo',
      defaultItemProps: {imageSrc: SPECTA_PLACEHOLDER_LOGO, alt: 'Logo'},
      arrayFields: {
        imageSrc: {type: 'text', label: 'Image URL'},
        alt: {type: 'text', label: 'Alt text'},
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckSpectaMarqueeBlock {...props} />,
};
