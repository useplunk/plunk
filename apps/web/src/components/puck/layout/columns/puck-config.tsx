import type {ComponentConfig} from '@puckeditor/core';

import {layoutFields} from '../shared/fields';
import {createDefaultColumnsProps} from './defaults';
import {PuckColumnsBlock} from './PuckColumnsBlock';
import type {ColumnsPuckProps} from './types';

export const columnsPuckComponent: ComponentConfig<ColumnsPuckProps> = {
  label: 'Columns',
  defaultProps: createDefaultColumnsProps(),
  fields: {
    leftColumn: {type: 'slot', label: 'Left column'},
    rightColumn: {type: 'slot', label: 'Right column'},
    ratio: {
      type: 'select',
      label: 'Column balance',
      options: [
        {label: 'Equal', value: 'equal'},
        {label: 'Left wider', value: 'leftWider'},
        {label: 'Right wider', value: 'rightWider'},
      ],
    },
    ...layoutFields(),
  },
  render: props => <PuckColumnsBlock {...props} />,
};
