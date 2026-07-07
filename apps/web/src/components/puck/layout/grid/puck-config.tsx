import type {ComponentConfig} from '@puckeditor/core';

import {layoutFields} from '../shared/fields';
import {createDefaultGridProps} from './defaults';
import {PuckGridBlock} from './PuckGridBlock';
import type {GridPuckProps} from './types';

export const gridPuckComponent: ComponentConfig<GridPuckProps> = {
  label: 'Grid',
  defaultProps: createDefaultGridProps(),
  fields: {
    content: {type: 'slot'},
    columns: {
      type: 'select',
      label: 'Columns',
      options: [
        {label: '1', value: 1},
        {label: '2', value: 2},
        {label: '3', value: 3},
        {label: '4', value: 4},
      ],
    },
    ...layoutFields(),
  },
  render: props => <PuckGridBlock {...props} />,
};
