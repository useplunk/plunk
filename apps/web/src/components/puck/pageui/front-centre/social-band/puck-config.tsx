import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../shared-fields';
import {createDefaultSocialBand} from './defaults';
import {PuckSocialBandBlock} from './PuckSocialBandBlock';
import type {PageUiSocialBandProps} from './types';

function buildFields(props: PageUiSocialBandProps): Fields<PageUiSocialBandProps> {
  const fields: Record<string, unknown> = {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    numberOfUsers: {type: 'number', label: 'Number of users', min: 0},
    showRating: yesNo('Show rating'),
    showAvatars: yesNo('Show avatars'),
    sectionId: sectionIdField,
  };

  if (props.showAvatars) {
    fields.avatars = {
      type: 'array',
      label: 'Avatars',
      getItemSummary: (item: PageUiSocialBandProps['avatars'][number]) => item.name || 'Avatar',
      defaultItemProps: {name: 'User', imageSrc: 'https://avatar.vercel.sh/user'},
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        imageSrc: {type: 'text', label: 'Image URL'},
      },
    };
  }

  return fields as Fields<PageUiSocialBandProps>;
}

const defaults = createDefaultSocialBand();

export const pageUiSocialBandPuckComponent: ComponentConfig<PageUiSocialBandProps> = {
  label: 'Social Band',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    if (!changed.showAvatars && lastFields) return lastFields;
    return buildFields(data.props as PageUiSocialBandProps);
  },
  render: props => <PuckSocialBandBlock {...props} />,
};
