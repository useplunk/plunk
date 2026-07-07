import type {ComponentConfig} from '@puckeditor/core';

import {layoutFields, wrapField} from '../shared/fields';
import {createDefaultFlexRowProps} from './defaults';
import {PuckFlexRowBlock} from './PuckFlexRowBlock';
import type {FlexRowPuckProps} from './types';

export const flexRowPuckComponent: ComponentConfig<FlexRowPuckProps> = {
  label: 'Flex Row',
  defaultProps: createDefaultFlexRowProps(),
  fields: {
    content: {type: 'slot'},
    wrap: wrapField,
    ...layoutFields(),
  },
  render: props => <PuckFlexRowBlock {...props} />,
};
