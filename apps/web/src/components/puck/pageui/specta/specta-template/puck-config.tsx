import type {ComponentConfig} from '@puckeditor/core';

import {createDefaultSpectaTemplate} from './defaults';
import {PuckSpectaTemplateBlock} from './PuckSpectaTemplateBlock';
import type {SpectaTemplateProps} from './types';

export const spectaTemplatePuckComponent: ComponentConfig<SpectaTemplateProps> = {
  label: 'Specta Template',
  defaultProps: createDefaultSpectaTemplate(),
  fields: {
    content: {type: 'slot'},
  },
  render: props => <PuckSpectaTemplateBlock {...props} />,
};
