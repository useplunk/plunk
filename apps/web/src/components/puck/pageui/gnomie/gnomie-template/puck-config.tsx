import type {ComponentConfig} from '@puckeditor/core';

import {createDefaultGnomieTemplate} from './defaults';
import {PuckGnomieTemplateBlock} from './PuckGnomieTemplateBlock';
import type {GnomieTemplateProps} from './types';

export const gnomieTemplatePuckComponent: ComponentConfig<GnomieTemplateProps> = {
  label: 'Gnomie Template',
  defaultProps: createDefaultGnomieTemplate(),
  fields: {
    content: {type: 'slot'},
  },
  render: props => <PuckGnomieTemplateBlock {...props} />,
};
