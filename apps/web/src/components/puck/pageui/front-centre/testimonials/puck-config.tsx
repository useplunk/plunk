import type {ComponentConfig} from '@puckeditor/core';

import {sectionIdField} from '../shared-fields';
import {createDefaultTestimonials} from './defaults';
import {PuckTestimonialsBlock} from './PuckTestimonialsBlock';
import type {PageUiTestimonialsProps} from './types';

export const pageUiTestimonialsPuckComponent: ComponentConfig<PageUiTestimonialsProps> = {
  label: 'Testimonials',
  defaultProps: createDefaultTestimonials(),
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
      getItemSummary: (item: PageUiTestimonialsProps['testimonials'][number]) => item.name || 'Testimonial',
      defaultItemProps: {
        name: 'Customer',
        text: 'Great product!',
        handle: '@user',
        imageSrc: 'https://avatar.vercel.sh/user',
        featured: false,
      },
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        text: {type: 'textarea', label: 'Quote'},
        handle: {type: 'text', label: 'Handle'},
        imageSrc: {type: 'text', label: 'Avatar URL'},
        featured: {
          type: 'radio',
          label: 'Featured',
          options: [
            {label: 'Yes', value: true},
            {label: 'No', value: false},
          ],
        },
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckTestimonialsBlock {...props} />,
};
