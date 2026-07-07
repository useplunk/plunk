import type {ComponentConfig} from '@puckeditor/core';

import {sectionIdField} from '../shared-fields';
import {createDefaultSocialProofBand} from './defaults';
import {PuckSocialProofBandBlock} from './PuckSocialProofBandBlock';
import type {PageUiSocialProofBandProps} from './types';

export const pageUiSocialProofBandPuckComponent: ComponentConfig<PageUiSocialProofBandProps> = {
  label: 'Social Proof Band',
  defaultProps: createDefaultSocialProofBand(),
  fields: {
    text: {type: 'text', label: 'Text', contentEditable: true},
    graphic: {
      type: 'select',
      label: 'Graphic',
      options: [
        {label: 'Gift', value: 'gift'},
        {label: 'Checkmark', value: 'checkmark'},
        {label: 'Trophy', value: 'trophy'},
        {label: 'Magic', value: 'magic'},
        {label: 'Zap', value: 'zap'},
        {label: 'Rocket', value: 'rocket'},
        {label: 'Time', value: 'time'},
        {label: 'Rating', value: 'rating'},
        {label: 'None', value: 'none'},
      ],
    },
    invert: {
      type: 'radio',
      label: 'Invert colors',
      options: [
        {label: 'Yes', value: true},
        {label: 'No', value: false},
      ],
    },
    hiddenOnMobile: {
      type: 'radio',
      label: 'Hide on mobile',
      options: [
        {label: 'Yes', value: true},
        {label: 'No', value: false},
      ],
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckSocialProofBandBlock {...props} />,
};
