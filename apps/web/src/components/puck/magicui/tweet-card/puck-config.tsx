import type {ComponentConfig, Fields} from '@puckeditor/core';

import {createDefaultTweetCard} from './defaults';
import {normalizeTweetCardDisplayFields} from './display';
import {PuckTweetCardBlock} from './PuckTweetCardBlock';
import type {TweetCardDisplayOptions, TweetCardPuckProps} from './types';

const yesNoRadio = (label: string) =>
  ({
    type: 'radio',
    label,
    options: [
      {label: 'Yes', value: true},
      {label: 'No', value: false},
    ],
  }) as const;

function buildTweetCardFields(props: TweetCardPuckProps): Fields<TweetCardPuckProps> {
  return {
    tweetId: {
      type: 'text',
      label: 'Tweet ID or URL',
    },
    align: {
      type: 'select',
      label: 'Alignment',
      options: [
        {label: 'Left', value: 'left'},
        {label: 'Center', value: 'center'},
        {label: 'Right', value: 'right'},
      ],
    },
    showHeader: yesNoRadio('Show header'),
    showBody: yesNoRadio('Show body'),
    showMedia: yesNoRadio('Show media'),
  } as unknown as Fields<TweetCardPuckProps>;
}

const defaultTweetCardProps = (): TweetCardPuckProps => createDefaultTweetCard();

type LegacyTweetCardProps = TweetCardPuckProps & {id?: string};

function migrateLegacyProps(props: LegacyTweetCardProps): TweetCardPuckProps {
  const defaults = createDefaultTweetCard();
  return {
    tweetId: props.tweetId || props.id || defaults.tweetId,
    align: props.align ?? defaults.align,
    showHeader: props.showHeader ?? defaults.showHeader,
    showBody: props.showBody ?? defaults.showBody,
    showMedia: props.showMedia ?? defaults.showMedia,
  };
}

export const tweetCardPuckComponent: ComponentConfig<TweetCardPuckProps> = {
  label: 'Tweet Card',
  defaultProps: defaultTweetCardProps(),
  fields: buildTweetCardFields(defaultTweetCardProps()),
  resolveFields: (_data, {changed, lastFields}) => {
    const displayKeys: Array<keyof TweetCardDisplayOptions> = [
      'showHeader',
      'showBody',
      'showMedia',
    ];
    const displayChanged = displayKeys.some(key => changed[key]);

    if (!displayChanged && lastFields) {
      return lastFields;
    }

    return buildTweetCardFields(_data.props as TweetCardPuckProps);
  },
  resolveData: ({props}, {changed}) => ({
    props: {
      ...props,
      ...normalizeTweetCardDisplayFields(
        {
          showHeader: props.showHeader ?? true,
          showBody: props.showBody ?? true,
          showMedia: props.showMedia ?? true,
        },
        changed as Partial<TweetCardDisplayOptions> | undefined,
      ),
    },
  }),
  render: props => {
    const migrated = migrateLegacyProps(props as LegacyTweetCardProps);
    const display = normalizeTweetCardDisplayFields({
      showHeader: migrated.showHeader,
      showBody: migrated.showBody,
      showMedia: migrated.showMedia,
    });

    return <PuckTweetCardBlock {...migrated} {...display} />;
  },
};
