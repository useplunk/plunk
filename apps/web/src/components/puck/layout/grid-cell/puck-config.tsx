import type {ComponentConfig} from '@puckeditor/core';

import {createDefaultGridCellProps} from './defaults';
import {PuckGridCellBlock} from './PuckGridCellBlock';
import type {GridCellPuckProps} from './types';

export const gridCellPuckComponent: ComponentConfig<GridCellPuckProps> = {
  label: 'Grid Cell',
  inline: true,
  defaultProps: createDefaultGridCellProps(),
  fields: {
    content: {type: 'slot'},
    width: {
      type: 'select',
      label: 'Width',
      options: [
        {label: 'Standard', value: 'standard'},
        {label: 'Double', value: 'double'},
        {label: 'Full row', value: 'full'},
      ],
    },
  },
  render: props => <PuckGridCellBlock {...props} />,
};
