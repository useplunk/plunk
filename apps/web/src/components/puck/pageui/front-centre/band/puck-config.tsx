import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../shared-fields';
import {createDefaultBand} from './defaults';
import {PuckBandBlock} from './PuckBandBlock';
import type {PageUiBandProps} from './types';

function buildFields(props: PageUiBandProps): Fields<PageUiBandProps> {
  const fields: Record<string, unknown> = {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showIcons: yesNo('Show icons'),
    sectionId: sectionIdField,
  };

  if (props.showIcons) {
    fields.icons = {
      type: 'array',
      label: 'Icons',
      getItemSummary: (item: PageUiBandProps['icons'][number]) => item.icon,
      defaultItemProps: {icon: 'chrome'},
      arrayFields: {
        icon: {
          type: 'select',
          label: 'Icon',
          options: [
            {label: 'Chrome', value: 'chrome'},
            {label: 'Figma', value: 'figma'},
            {label: 'GitHub', value: 'github'},
            {label: 'Framer', value: 'framer'},
          ],
        },
      },
    };
  }

  return fields as Fields<PageUiBandProps>;
}

const defaults = createDefaultBand();

export const pageUiBandPuckComponent: ComponentConfig<PageUiBandProps> = {
  label: 'Band',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    if (!changed.showIcons && lastFields) return lastFields;
    return buildFields(data.props as PageUiBandProps);
  },
  render: props => <PuckBandBlock {...props} />,
};
