import type {ComponentConfig} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomieFaq} from './defaults';
import {PuckGnomieFaqBlock} from './PuckGnomieFaqBlock';
import type {GnomieFaqProps} from './types';

export const gnomieFaqPuckComponent: ComponentConfig<GnomieFaqProps> = {
  label: 'Gnomie FAQ',
  defaultProps: createDefaultGnomieFaq(),
  fields: {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    withBackground: yesNo('Background'),
    faqItems: {
      type: 'array',
      label: 'FAQ items',
      getItemSummary: (item: GnomieFaqProps['faqItems'][number]) => item.question || 'FAQ',
      defaultItemProps: {question: 'Question?', answer: 'Answer.'},
      arrayFields: {
        question: {type: 'text', label: 'Question'},
        answer: {type: 'textarea', label: 'Answer'},
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckGnomieFaqBlock {...props} />,
};
