import type {ComponentConfig, Fields} from '@puckeditor/core';

import {createDefaultAnimatedList} from './defaults';
import {normalizeAnimatedListDisplayFields} from './display';
import {PuckAnimatedListBlock} from './PuckAnimatedListBlock';
import type {AnimatedListDisplayOptions, AnimatedListPuckProps} from './types';

const yesNoRadio = (label: string) =>
  ({
    type: 'radio',
    label,
    options: [
      {label: 'Yes', value: true},
      {label: 'No', value: false},
    ],
  }) as const;

function buildAnimatedListFields(props: AnimatedListPuckProps): Fields<AnimatedListPuckProps> {
  const arrayFields: Record<string, {type: string; label: string}> = {};

  if (props.showName) {
    arrayFields.name = {type: 'text', label: 'Name'};
  }
  if (props.showDescription) {
    arrayFields.description = {type: 'text', label: 'Description'};
  }
  if (props.showTime) {
    arrayFields.time = {type: 'text', label: 'Time'};
  }
  if (props.showIcon) {
    arrayFields.icon = {type: 'text', label: 'Icon'};
    arrayFields.color = {type: 'text', label: 'Icon color'};
  }

  return {
    showIcon: yesNoRadio('Show icon'),
    showName: yesNoRadio('Show name'),
    showDescription: yesNoRadio('Show description'),
    showTime: yesNoRadio('Show time'),
    items: {
      type: 'array',
      label: 'Notifications',
      getItemSummary: (item: AnimatedListPuckProps['items'][number]) =>
        item.name || item.description || 'Notification',
      defaultItemProps: {
        name: 'New notification',
        description: 'Description',
        time: 'Just now',
        icon: '🔔',
        color: '#1E86FF',
      },
      arrayFields,
    },
    delay: {
      type: 'number',
      label: 'Delay between items (ms)',
      min: 200,
      max: 5000,
    },
    containerHeight: {
      type: 'number',
      label: 'Container height (px)',
      min: 200,
      max: 800,
    },
    itemMaxWidth: {
      type: 'number',
      label: 'Item max width (px)',
      min: 280,
      max: 600,
    },
    repeatCycles: {
      type: 'number',
      label: 'Repeat cycles',
      min: 1,
      max: 20,
    },
    gap: {
      type: 'number',
      label: 'Gap between items (rem)',
      min: 0,
      max: 3,
    },
    showBottomFade: yesNoRadio('Show bottom fade'),
  } as unknown as Fields<AnimatedListPuckProps>;
}

const defaultAnimatedListProps = (): AnimatedListPuckProps => ({
  items: createDefaultAnimatedList(),
  showIcon: true,
  showName: true,
  showDescription: true,
  showTime: true,
  delay: 1000,
  containerHeight: 500,
  itemMaxWidth: 400,
  showBottomFade: true,
  repeatCycles: 1,
  gap: 1,
});

export const animatedListPuckComponent: ComponentConfig<AnimatedListPuckProps> = {
  label: 'Animated List',
  defaultProps: defaultAnimatedListProps(),
  fields: buildAnimatedListFields(defaultAnimatedListProps()),
  resolveFields: (data, {changed, lastFields}) => {
    const displayKeys: Array<keyof AnimatedListDisplayOptions> = [
      'showIcon',
      'showName',
      'showDescription',
      'showTime',
    ];
    const displayChanged = displayKeys.some(key => changed[key]);

    if (!displayChanged && lastFields) {
      return lastFields;
    }

    return buildAnimatedListFields(data.props as AnimatedListPuckProps);
  },
  resolveData: ({props}, {changed}) => ({
    props: {
      ...props,
      ...normalizeAnimatedListDisplayFields(
        {
          showIcon: props.showIcon ?? true,
          showName: props.showName ?? true,
          showDescription: props.showDescription ?? true,
          showTime: props.showTime ?? true,
        },
        changed as Partial<AnimatedListDisplayOptions> | undefined,
      ),
    },
  }),
  render: props => {
    const items =
      props.items?.length > 0 ? props.items : createDefaultAnimatedList();

    const display = normalizeAnimatedListDisplayFields({
      showIcon: props.showIcon ?? true,
      showName: props.showName ?? true,
      showDescription: props.showDescription ?? true,
      showTime: props.showTime ?? true,
    });

    return <PuckAnimatedListBlock {...props} {...display} items={items} />;
  },
};
