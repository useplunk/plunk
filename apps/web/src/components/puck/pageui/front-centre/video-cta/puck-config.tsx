import type {ComponentConfig, Fields} from '@puckeditor/core';

import {createDefaultVideoCta} from './defaults';
import {PuckVideoCtaBlock} from './PuckVideoCtaBlock';
import type {PageUiVideoCtaProps} from './types';
import {yesNo, sectionIdField} from '../shared-fields';

function buildFields(props: PageUiVideoCtaProps): Fields<PageUiVideoCtaProps> {
  const fields: Record<string, unknown> = {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    videoSrc: {type: 'text', label: 'Video URL'},
    autoPlay: yesNo('Autoplay'),
    controls: yesNo('Show controls'),
    variant: {
      type: 'select',
      label: 'Variant',
      options: [
        {label: 'Primary', value: 'primary'},
        {label: 'Secondary', value: 'secondary'},
      ],
    },
    withBackground: yesNo('Background'),
    showPrimaryCta: yesNo('Show primary CTA'),
    showSecondaryCta: yesNo('Show secondary CTA'),
    showDiscount: yesNo('Show discount'),
    showSocialProof: yesNo('Show social proof'),
    numberOfUsers: {type: 'number', label: 'Number of users', min: 0},
    suffixText: {type: 'text', label: 'Social proof suffix', contentEditable: true},
    sectionId: sectionIdField,
  };

  if (props.showPrimaryCta) {
    fields.primaryCtaLabel = {type: 'text', label: 'Primary CTA label', contentEditable: true};
    fields.primaryCtaHref = {type: 'text', label: 'Primary CTA URL'};
  }
  if (props.showSecondaryCta) {
    fields.secondaryCtaLabel = {type: 'text', label: 'Secondary CTA label', contentEditable: true};
    fields.secondaryCtaHref = {type: 'text', label: 'Secondary CTA URL'};
  }
  if (props.showDiscount) {
    fields.showDiscountIcon = yesNo('Show gift icon');
    fields.discountValueText = {type: 'text', label: 'Discount value', contentEditable: true};
    fields.discountDescriptionText = {type: 'text', label: 'Discount description', contentEditable: true};
  }
  if (props.showSocialProof) {
    fields.showSocialProofRating = yesNo('Show rating');
    fields.showSocialProofAvatars = yesNo('Show avatars');
    fields.avatars = {
      type: 'array',
      label: 'Avatars',
      getItemSummary: (item: PageUiVideoCtaProps['avatars'][number]) => item.name || 'Avatar',
      defaultItemProps: {name: 'User', imageSrc: 'https://avatar.vercel.sh/user'},
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        imageSrc: {type: 'text', label: 'Image URL'},
      },
    };
  }

  return fields as Fields<PageUiVideoCtaProps>;
}

const defaults = createDefaultVideoCta();

export const pageUiVideoCtaPuckComponent: ComponentConfig<PageUiVideoCtaProps> = {
  label: 'Video CTA',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = [
      'showPrimaryCta',
      'showSecondaryCta',
      'showDiscount',
      'showSocialProof',
    ].some(k => changed[k as keyof PageUiVideoCtaProps]);
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as PageUiVideoCtaProps);
  },
  render: props => <PuckVideoCtaBlock {...props} />,
};
