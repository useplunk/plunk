import type {ComponentConfig, Fields} from '@puckeditor/core';

import {createDefaultHeroVideoDialog} from './defaults';
import {PuckHeroVideoDialogBlock} from './PuckHeroVideoDialogBlock';
import type {HeroVideoAnimationStyle, HeroVideoDialogPuckProps} from './types';

const ANIMATION_OPTIONS: Array<{label: string; value: HeroVideoAnimationStyle}> = [
  {label: 'From center', value: 'from-center'},
  {label: 'From bottom', value: 'from-bottom'},
  {label: 'From top', value: 'from-top'},
  {label: 'From left', value: 'from-left'},
  {label: 'From right', value: 'from-right'},
  {label: 'Fade', value: 'fade'},
  {label: 'Top in, bottom out', value: 'top-in-bottom-out'},
  {label: 'Left in, right out', value: 'left-in-right-out'},
];

const yesNoRadio = (label: string) =>
  ({
    type: 'radio',
    label,
    options: [
      {label: 'Yes', value: true},
      {label: 'No', value: false},
    ],
  }) as const;

function buildHeroVideoDialogFields(props: HeroVideoDialogPuckProps): Fields<HeroVideoDialogPuckProps> {
  const fields = {
    videoSrc: {
      type: 'text',
      label: 'Video URL (embed)',
    },
    thumbnailSrc: {
      type: 'text',
      label: props.dualTheme ? 'Thumbnail URL (light)' : 'Thumbnail URL',
    },
    thumbnailAlt: {
      type: 'text',
      label: 'Thumbnail alt text',
    },
    animationStyle: {
      type: 'select',
      label: 'Animation style',
      options: ANIMATION_OPTIONS,
    },
    dualTheme: yesNoRadio('Dual theme thumbnails'),
    align: {
      type: 'select',
      label: 'Alignment',
      options: [
        {label: 'Left', value: 'left'},
        {label: 'Center', value: 'center'},
        {label: 'Right', value: 'right'},
      ],
    },
    rounded: yesNoRadio('Rounded thumbnail'),
  };

  if (props.dualTheme) {
    (fields as unknown as Fields<HeroVideoDialogPuckProps>).thumbnailSrcDark = {
      type: 'text',
      label: 'Thumbnail URL (dark)',
    };
  }

  return fields as unknown as Fields<HeroVideoDialogPuckProps>;
}

const defaultHeroVideoDialogProps = (): HeroVideoDialogPuckProps => createDefaultHeroVideoDialog();

export const heroVideoDialogPuckComponent: ComponentConfig<HeroVideoDialogPuckProps> = {
  label: 'Hero Video Dialog',
  defaultProps: defaultHeroVideoDialogProps(),
  fields: buildHeroVideoDialogFields(defaultHeroVideoDialogProps()),
  resolveFields: (data, {changed, lastFields}) => {
    if (!changed.dualTheme && lastFields) {
      return lastFields;
    }

    return buildHeroVideoDialogFields(data.props as HeroVideoDialogPuckProps);
  },
  render: props => <PuckHeroVideoDialogBlock {...props} />,
};
