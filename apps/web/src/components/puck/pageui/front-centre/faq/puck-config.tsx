import type {ComponentConfig} from '@puckeditor/core';

import {sectionIdField} from '../shared-fields';
import {createDefaultFaq} from './defaults';
import {PuckFaqBlock} from './PuckFaqBlock';
import type {PageUiFaqProps} from './types';

export const pageUiFaqPuckComponent: ComponentConfig<PageUiFaqProps> = {
  label: 'FAQ',
  defaultProps: createDefaultFaq(),
  fields: {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    withBackground: {
      type: 'radio',
      label: 'Background',
      options: [
        {label: 'Yes', value: true},
        {label: 'No', value: false},
      ],
    },
    faqItems: {
      type: 'array',
      label: 'Questions',
      getItemSummary: (item: PageUiFaqProps['faqItems'][number]) => item.question || 'Question',
      defaultItemProps: {question: 'New question?', answer: 'Answer here.'},
      arrayFields: {
        question: {type: 'text', label: 'Question'},
        answer: {type: 'textarea', label: 'Answer'},
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckFaqBlock {...props} />,
};
