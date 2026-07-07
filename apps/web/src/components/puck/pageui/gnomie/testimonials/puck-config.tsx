import type {ComponentConfig} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomieTestimonials} from './defaults';
import {PuckGnomieTestimonialsBlock} from './PuckGnomieTestimonialsBlock';
import type {GnomieTestimonialsProps} from './types';

export const gnomieTestimonialsPuckComponent: ComponentConfig<GnomieTestimonialsProps> = {
  label: 'Gnomie Testimonials',
  defaultProps: createDefaultGnomieTestimonials(),
  fields: {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    readMoreSize: {
      type: 'select',
      label: 'Read more size',
      options: [
        {label: 'Small', value: 'sm'},
        {label: 'Medium', value: 'md'},
        {label: 'Large', value: 'lg'},
      ],
    },
    testimonials: {
      type: 'array',
      label: 'Testimonials',
      getItemSummary: (item: GnomieTestimonialsProps['testimonials'][number]) => item.name || 'Testimonial',
      defaultItemProps: {
        name: 'Customer',
        text: 'Great product!',
        handle: '@customer',
        imageSrc: 'https://picsum.photos/100/100.webp?random=7',
        featured: false,
      },
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        text: {type: 'textarea', label: 'Quote'},
        handle: {type: 'text', label: 'Handle'},
        imageSrc: {type: 'text', label: 'Image URL'},
        featured: yesNo('Featured'),
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckGnomieTestimonialsBlock {...props} />,
};
