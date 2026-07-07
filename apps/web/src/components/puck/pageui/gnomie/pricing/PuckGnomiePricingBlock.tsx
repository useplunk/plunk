import {LandingPricing, type PricingTier} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {GnomiePricingProps, GnomiePricingTier} from './types';

function toPricingTier(tier: GnomiePricingTier): PricingTier {
  return {
    name: tier.name,
    id: tier.id,
    href: tier.href,
    price: {'1': tier.monthlyPrice, '2': tier.annualPrice},
    discountPrice: {'1': tier.monthlyDiscountPrice, '2': tier.annualDiscountPrice},
    description: tier.description,
    features: tier.featuresText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean),
    featured: tier.featured,
    highlighted: tier.highlighted,
    soldOut: tier.soldOut,
    cta: tier.cta,
  };
}

export function PuckGnomiePricingBlock(props: GnomiePricingProps) {
  return (
    <LandingPricing
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      description={props.description}
      bannerText={props.bannerText || undefined}
      frequencies={props.frequencies}
      tiers={props.tiers.map(toPricingTier)}
      defaultFrequencyValue={props.defaultFrequencyValue}
    />
  );
}
