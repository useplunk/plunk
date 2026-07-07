import {cloneGnomiePricingFrequencies} from '../shared-defaults';
import type {GnomiePricingProps, GnomiePricingTier} from './types';

function toGnomieTier(tier: {
  name: string;
  id: string;
  href: string;
  price: Record<string, string>;
  discountPrice: Record<string, string>;
  description: string;
  features: string[];
  featured?: boolean;
  highlighted?: boolean;
  soldOut?: boolean;
  cta: string;
}): GnomiePricingTier {
  return {
    name: tier.name,
    id: tier.id,
    href: tier.href,
    monthlyPrice: tier.price['1'] ?? '',
    annualPrice: tier.price['2'] ?? '',
    monthlyDiscountPrice: tier.discountPrice['1'] ?? '',
    annualDiscountPrice: tier.discountPrice['2'] ?? '',
    description: tier.description,
    featuresText: tier.features.join('\n'),
    featured: tier.featured ?? false,
    highlighted: tier.highlighted ?? false,
    soldOut: tier.soldOut ?? false,
    cta: tier.cta,
  };
}

export function createDefaultGnomiePricing(): GnomiePricingProps {
  return {
    title: 'Affordable Plans for Every Gardener',
    description:
      "At Gnomie, we believe that everyone should have access to beautiful, thriving outdoor spaces—whether you're a seasoned gardener or just starting out.",
    bannerText: '',
    defaultFrequencyValue: '1',
    frequencies: cloneGnomiePricingFrequencies(),
    tiers: [
      toGnomieTier({
        name: 'Casual',
        id: '0',
        href: '#',
        price: {'1': '$25', '2': '$250'},
        discountPrice: {'1': '', '2': ''},
        description: 'Use up to 5 photos per months and generate 60 garden variations',
        features: ['One-time payment', '5 photos', '60 garden variations', 'Object removal'],
        featured: false,
        highlighted: false,
        soldOut: false,
        cta: 'Get started',
      }),
      toGnomieTier({
        name: 'Enthusiast',
        id: '1',
        href: '#',
        price: {'1': '$39', '2': '$399'},
        discountPrice: {'1': '', '2': ''},
        description: 'Use up to 10 photos per months and generate 200 garden variations',
        features: [
          'One-time payment',
          '10 photos',
          '200 garden variations',
          'Object removal',
          'Decluttering',
          'Enhanced quality',
        ],
        featured: false,
        highlighted: true,
        soldOut: false,
        cta: 'Get started',
      }),
    ],
    sectionId: '',
  };
}
