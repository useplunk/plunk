import type {ComponentConfig} from '@puckeditor/core';

import {createDefaultFrontCentreTemplate} from './defaults';
import {PuckFrontCentreTemplateBlock} from './PuckFrontCentreTemplateBlock';
import type {FrontCentreTemplateProps} from './types';

export const frontCentreTemplatePuckComponent: ComponentConfig<FrontCentreTemplateProps> = {
  label: 'Front Centre Template',
  defaultProps: createDefaultFrontCentreTemplate(),
  fields: {
    content: {type: 'slot'},
  },
  render: props => <PuckFrontCentreTemplateBlock {...props} />,
};
