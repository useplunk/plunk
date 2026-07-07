import type {ComponentConfig} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultSpectaTestimonialInline} from './defaults';
import {PuckSpectaTestimonialInlineBlock} from './PuckSpectaTestimonialInlineBlock';
import type {SpectaTestimonialInlineProps} from './types';

export const spectaTestimonialInlinePuckComponent: ComponentConfig<SpectaTestimonialInlineProps> = {
  label: 'Specta Testimonial Inline',
  defaultProps: createDefaultSpectaTestimonialInline(),
  fields: {
    withBackground: yesNo('Background'),
    items: {
      type: 'array',
      label: 'Testimonials',
      getItemSummary: (item: SpectaTestimonialInlineProps['items'][number]) => item.name || 'Testimonial',
      defaultItemProps: {
        name: 'Customer',
        text: 'Great product!',
        suffix: '',
        imageSrc: '',
      },
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        text: {type: 'textarea', label: 'Quote'},
        suffix: {type: 'text', label: 'Suffix'},
        imageSrc: {type: 'text', label: 'Avatar URL (optional)'},
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckSpectaTestimonialInlineBlock {...props} />,
};
