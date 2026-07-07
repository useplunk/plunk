import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultSpectaVideoCta} from './defaults';
import {PuckSpectaVideoCtaBlock} from './PuckSpectaVideoCtaBlock';
import type {SpectaVideoCtaProps} from './types';

function buildFields(props: SpectaVideoCtaProps): Fields<SpectaVideoCtaProps> {
  const fields: Record<string, unknown> = {
    eyebrow: {type: 'text', label: 'Eyebrow', contentEditable: true},
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    videoSrc: {type: 'text', label: 'Video URL'},
    autoPlay: yesNo('Autoplay'),
    controls: yesNo('Show controls'),
    withBackground: yesNo('Background'),
    showPrimaryCta: yesNo('Show primary CTA'),
    showSocialProof: yesNo('Show social proof'),
    sectionId: sectionIdField,
  };

  if (props.showPrimaryCta) {
    fields.primaryCtaLabel = {type: 'text', label: 'Primary CTA label', contentEditable: true};
    fields.primaryCtaHref = {type: 'text', label: 'Primary CTA URL'};
  }

  if (props.showSocialProof) {
    fields.showSocialProofRating = yesNo('Show rating');
    fields.showSocialProofAvatars = yesNo('Show avatars');
    fields.numberOfUsers = {type: 'number', label: 'Number of users', min: 0};
    fields.suffixText = {type: 'text', label: 'Social proof suffix', contentEditable: true};
    fields.avatars = {
      type: 'array',
      label: 'Avatars',
      getItemSummary: (item: SpectaVideoCtaProps['avatars'][number]) => item.name || 'Avatar',
      defaultItemProps: {name: 'User', imageSrc: 'https://avatar.vercel.sh/user'},
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        imageSrc: {type: 'text', label: 'Image URL'},
      },
    };
  }

  return fields as Fields<SpectaVideoCtaProps>;
}

const defaults = createDefaultSpectaVideoCta();

export const spectaVideoCtaPuckComponent: ComponentConfig<SpectaVideoCtaProps> = {
  label: 'Specta Video CTA',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = ['showPrimaryCta', 'showSocialProof'].some(
      k => changed[k as keyof SpectaVideoCtaProps],
    );
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as SpectaVideoCtaProps);
  },
  render: props => <PuckSpectaVideoCtaBlock {...props} />,
};
