import type {ComponentConfig} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomiePricing} from './defaults';
import {PuckGnomiePricingBlock} from './PuckGnomiePricingBlock';
import type {GnomiePricingProps} from './types';

export const gnomiePricingPuckComponent: ComponentConfig<GnomiePricingProps> = {
  label: 'Gnomie Pricing',
  defaultProps: createDefaultGnomiePricing(),
  fields: {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    bannerText: {type: 'text', label: 'Banner text', contentEditable: true},
    defaultFrequencyValue: {type: 'text', label: 'Default frequency value'},
    frequencies: {
      type: 'array',
      label: 'Frequencies',
      getItemSummary: (item: GnomiePricingProps['frequencies'][number]) => item.label || 'Frequency',
      defaultItemProps: {id: '1', value: '1', label: 'Monthly', priceSuffix: '/month'},
      arrayFields: {
        id: {type: 'text', label: 'ID'},
        value: {type: 'text', label: 'Value'},
        label: {type: 'text', label: 'Label'},
        priceSuffix: {type: 'text', label: 'Price suffix'},
      },
    },
    tiers: {
      type: 'array',
      label: 'Pricing tiers',
      getItemSummary: (item: GnomiePricingProps['tiers'][number]) => item.name || 'Tier',
      defaultItemProps: {
        name: 'Plan',
        id: 'tier-new',
        href: '#',
        monthlyPrice: '$19',
        annualPrice: '$190',
        monthlyDiscountPrice: '',
        annualDiscountPrice: '',
        description: 'Plan description',
        featuresText: 'Feature one\nFeature two',
        featured: false,
        highlighted: false,
        soldOut: false,
        cta: 'Get started',
      },
      arrayFields: {
        name: {type: 'text', label: 'Name'},
        id: {type: 'text', label: 'ID'},
        href: {type: 'text', label: 'Link URL'},
        description: {type: 'textarea', label: 'Description'},
        monthlyPrice: {type: 'text', label: 'Monthly price'},
        annualPrice: {type: 'text', label: 'Annual price'},
        monthlyDiscountPrice: {type: 'text', label: 'Monthly discount price'},
        annualDiscountPrice: {type: 'text', label: 'Annual discount price'},
        featuresText: {type: 'textarea', label: 'Features (one per line)'},
        cta: {type: 'text', label: 'CTA label'},
        featured: yesNo('Featured'),
        highlighted: yesNo('Highlighted'),
        soldOut: yesNo('Sold out'),
      },
    },
    sectionId: sectionIdField,
  },
  render: props => <PuckGnomiePricingBlock {...props} />,
};
