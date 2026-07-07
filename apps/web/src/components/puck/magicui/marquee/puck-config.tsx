import type {ComponentConfig, Fields} from '@puckeditor/core';

import {createDefaultMarqueeCards} from './defaults';
import {normalizeMarqueeDisplayFields} from './display';
import {PuckMarqueeBlock} from './PuckMarqueeBlock';
import type {MarqueeDisplayOptions, MarqueePuckProps} from './types';

const yesNoRadio = (label: string) =>
  ({
    type: 'radio',
    label,
    options: [
      {label: 'Yes', value: true},
      {label: 'No', value: false},
    ],
  }) as const;

function buildMarqueeFields(props: MarqueePuckProps): Fields<MarqueePuckProps> {
  const arrayFields: Record<string, {type: string; label: string}> = {};

  if (props.showName) {
    arrayFields.name = {type: 'text', label: 'Name'};
  }
  if (props.showUsername) {
    arrayFields.username = {type: 'text', label: 'Username'};
  }
  if (props.showReview) {
    arrayFields.body = {type: 'textarea', label: 'Review'};
  }
  if (props.showAvatar) {
    arrayFields.img = {type: 'text', label: 'Avatar URL'};
  }

  return {
    showAvatar: yesNoRadio('Show avatar'),
    showName: yesNoRadio('Show name'),
    showUsername: yesNoRadio('Show username'),
    showReview: yesNoRadio('Show review'),
    cards: {
      type: 'array',
      label: 'Review cards',
      getItemSummary: (item: MarqueePuckProps['cards'][number]) =>
        item.name || item.username || item.body || 'Review',
      defaultItemProps: {
        name: 'New review',
        username: '@user',
        body: 'Write a short testimonial here.',
        img: 'https://avatar.vercel.sh/user',
      },
      arrayFields,
    },
    dualRow: yesNoRadio('Dual row'),
    showFadeEdges: yesNoRadio('Fade edges'),
    pauseOnHover: yesNoRadio('Pause on hover'),
    duration: {
      type: 'number',
      label: 'Duration (seconds)',
      min: 5,
      max: 120,
    },
  } as unknown as Fields<MarqueePuckProps>;
}

const defaultMarqueeProps = (): MarqueePuckProps => ({
  cards: createDefaultMarqueeCards(),
  showAvatar: true,
  showName: true,
  showUsername: true,
  showReview: true,
  dualRow: true,
  showFadeEdges: true,
  pauseOnHover: true,
  duration: 20,
});

export const marqueePuckComponent: ComponentConfig<MarqueePuckProps> = {
  label: 'Marquee',
  defaultProps: defaultMarqueeProps(),
  fields: buildMarqueeFields(defaultMarqueeProps()),
  resolveFields: (data, {changed, lastFields}) => {
    const displayKeys: Array<keyof MarqueeDisplayOptions> = [
      'showAvatar',
      'showName',
      'showUsername',
      'showReview',
    ];
    const displayChanged = displayKeys.some(key => changed[key]);

    if (!displayChanged && lastFields) {
      return lastFields;
    }

    return buildMarqueeFields(data.props as MarqueePuckProps);
  },
  resolveData: ({props}, {changed}) => ({
    props: {
      ...props,
      ...normalizeMarqueeDisplayFields(
        {
          showAvatar: props.showAvatar ?? true,
          showName: props.showName ?? true,
          showUsername: props.showUsername ?? true,
          showReview: props.showReview ?? true,
        },
        changed as Partial<MarqueeDisplayOptions> | undefined,
      ),
    },
  }),
  render: props => {
    const legacyItems = (props as {items?: Array<{label: string}>}).items;
    const cards =
      props.cards?.length > 0
        ? props.cards
        : legacyItems?.map(item => ({
            name: item.label,
            username: '@user',
            body: item.label,
            img: `https://avatar.vercel.sh/${encodeURIComponent(item.label.toLowerCase().replace(/\s+/g, ''))}`,
          })) ?? createDefaultMarqueeCards();

    const display = normalizeMarqueeDisplayFields({
      showAvatar: props.showAvatar ?? true,
      showName: props.showName ?? true,
      showUsername: props.showUsername ?? true,
      showReview: props.showReview ?? true,
    });

    return <PuckMarqueeBlock {...props} {...display} cards={cards} />;
  },
};
