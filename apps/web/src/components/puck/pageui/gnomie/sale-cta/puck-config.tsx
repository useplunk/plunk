import type {ComponentConfig} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomieSaleCta} from './defaults';
import {PuckGnomieSaleCtaBlock} from './PuckGnomieSaleCtaBlock';
import type {GnomieSaleCtaProps} from './types';

export const gnomieSaleCtaPuckComponent: ComponentConfig<GnomieSaleCtaProps> = {
  label: 'Gnomie Sale CTA',
  defaultProps: createDefaultGnomieSaleCta(),
  fields: {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showCta: yesNo('Show CTA'),
    ctaLabel: {type: 'text', label: 'CTA label', contentEditable: true},
    ctaHref: {type: 'text', label: 'CTA URL'},
    showSocialProof: yesNo('Show social proof'),
    showSocialProofRating: yesNo('Show rating'),
    showSocialProofAvatars: yesNo('Show avatars'),
    numberOfUsers: {type: 'number', label: 'Number of users'},
    suffixText: {type: 'text', label: 'Suffix text', contentEditable: true},
    avatars: {
      type: 'array',
      label: 'Avatars',
      getItemSummary: (item: GnomieSaleCtaProps['avatars'][number]) => item.name || 'Avatar',
      defaultItemProps: {imageSrc: 'https://picsum.photos/id/64/100/100', name: 'User'},
      arrayFields: {
        imageSrc: {type: 'text', label: 'Image URL'},
        name: {type: 'text', label: 'Name'},
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckGnomieSaleCtaBlock {...props} />,
};
