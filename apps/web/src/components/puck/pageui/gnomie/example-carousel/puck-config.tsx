import type {ComponentConfig, Fields} from '@puckeditor/core';

import type {ExampleCarouselSocial} from '../../../../pageui/landing';
import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomieExampleCarouselMadeWith} from './defaults';
import {PuckGnomieExampleCarouselBlock} from './PuckGnomieExampleCarouselBlock';
import type {GnomieExampleCarouselProps} from './types';

const socialOptions = [
  {label: 'Instagram', value: 'instagram'},
  {label: 'Facebook', value: 'facebook'},
  {label: 'LinkedIn', value: 'linkedin'},
];

function buildFields(props: GnomieExampleCarouselProps): Fields<GnomieExampleCarouselProps> {
  const fields: Record<string, unknown> = {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showHeaderCta: yesNo('Show header CTA'),
    showSocialProof: yesNo('Show social proof'),
    showCtaCard: yesNo('Show CTA card'),
    ctaLabel: {type: 'text', label: 'CTA card label', contentEditable: true},
    ctaHref: {type: 'text', label: 'CTA card URL'},
    ctaNote: {type: 'text', label: 'CTA note', contentEditable: true},
    ctaNoteSecondary: {type: 'text', label: 'Secondary CTA note', contentEditable: true},
    items: {
      type: 'array',
      label: 'Carousel items',
      getItemSummary: (item: GnomieExampleCarouselProps['items'][number]) => item.name || 'Item',
      defaultItemProps: {
        imageSrc: 'https://picsum.photos/id/15/800/800',
        name: 'Customer',
        location: 'City, ST',
        socials: ['instagram'],
      },
      arrayFields: {
        imageSrc: {type: 'text', label: 'Image URL'},
        name: {type: 'text', label: 'Name'},
        location: {type: 'text', label: 'Location'},
        socials: {
          type: 'array',
          label: 'Social icons',
          getItemSummary: (item: {platform: ExampleCarouselSocial}) => item.platform || 'Social',
          defaultItemProps: {platform: 'instagram' as ExampleCarouselSocial},
          arrayFields: {
            platform: {
              type: 'select',
              label: 'Social',
              options: socialOptions,
            },
          },
        },
      },
    },
    sectionId: sectionIdField,
  };

  if (props.showHeaderCta) {
    fields.headerCtaLabel = {type: 'text', label: 'Header CTA label', contentEditable: true};
    fields.headerCtaHref = {type: 'text', label: 'Header CTA URL'};
  }

  if (props.showSocialProof) {
    fields.showSocialProofRating = yesNo('Show rating');
    fields.showSocialProofAvatars = yesNo('Show avatars');
    fields.numberOfUsers = {type: 'number', label: 'Number of users'};
    fields.suffixText = {type: 'text', label: 'Suffix text', contentEditable: true};
    fields.avatars = {
      type: 'array',
      label: 'Avatars',
      getItemSummary: (item: GnomieExampleCarouselProps['avatars'][number]) => item.name || 'Avatar',
      defaultItemProps: {imageSrc: 'https://picsum.photos/id/64/100/100', name: 'User'},
      arrayFields: {
        imageSrc: {type: 'text', label: 'Image URL'},
        name: {type: 'text', label: 'Name'},
      },
    };
  }

  return fields as Fields<GnomieExampleCarouselProps>;
}

const defaults = createDefaultGnomieExampleCarouselMadeWith();

export const gnomieExampleCarouselPuckComponent: ComponentConfig<GnomieExampleCarouselProps> = {
  label: 'Gnomie Example Carousel',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = ['showHeaderCta', 'showSocialProof', 'showCtaCard'].some(
      k => changed[k as keyof GnomieExampleCarouselProps],
    );
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as GnomieExampleCarouselProps);
  },
  render: props => <PuckGnomieExampleCarouselBlock {...props} />,
};
