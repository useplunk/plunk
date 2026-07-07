import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultSpectaSaleCta} from './defaults';
import {PuckSpectaSaleCtaBlock} from './PuckSpectaSaleCtaBlock';
import type {SpectaSaleCtaProps} from './types';

function buildFields(props: SpectaSaleCtaProps): Fields<SpectaSaleCtaProps> {
  const fields: Record<string, unknown> = {
    eyebrow: {type: 'text', label: 'Eyebrow', contentEditable: true},
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showCta: yesNo('Show CTA'),
    showSocialProof: yesNo('Show social proof'),
    withBackground: yesNo('Background'),
    withBackgroundGlow: yesNo('Background glow'),
    sectionId: sectionIdField,
  };

  if (props.showCta) {
    fields.ctaHref = {type: 'text', label: 'CTA URL'};
    fields.ctaLabel = {type: 'text', label: 'CTA label', contentEditable: true};
  }

  if (props.showSocialProof) {
    fields.showSocialProofRating = yesNo('Show rating');
    fields.showSocialProofAvatars = yesNo('Show avatars');
    fields.numberOfUsers = {type: 'number', label: 'Number of users', min: 0};
    fields.suffixText = {type: 'text', label: 'Social proof suffix', contentEditable: true};
    fields.socialProofFooter = {
      type: 'text',
      label: 'Social proof footer',
      contentEditable: true,
    };
    fields.avatars = {
      type: 'array',
      label: 'Avatars',
      getItemSummary: (item: SpectaSaleCtaProps['avatars'][number]) => item.name || 'Avatar',
      defaultItemProps: {name: 'User', imageSrc: 'https://avatar.vercel.sh/user'},
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        imageSrc: {type: 'text', label: 'Image URL'},
      },
    };
  }

  return fields as Fields<SpectaSaleCtaProps>;
}

const defaults = createDefaultSpectaSaleCta();

export const spectaSaleCtaPuckComponent: ComponentConfig<SpectaSaleCtaProps> = {
  label: 'Specta Sale CTA',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = ['showCta', 'showSocialProof'].some(
      k => changed[k as keyof SpectaSaleCtaProps],
    );
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as SpectaSaleCtaProps);
  },
  render: props => <PuckSpectaSaleCtaBlock {...props} />,
};
