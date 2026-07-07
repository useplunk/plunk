import type {PricingTierFrequency} from '../../../../pageui/landing';

export interface GnomiePricingTier {
  name: string;
  id: string;
  href: string;
  monthlyPrice: string;
  annualPrice: string;
  monthlyDiscountPrice: string;
  annualDiscountPrice: string;
  description: string;
  featuresText: string;
  featured: boolean;
  highlighted: boolean;
  soldOut: boolean;
  cta: string;
}

export interface GnomiePricingProps {
  title: string;
  description: string;
  bannerText: string;
  defaultFrequencyValue: string;
  frequencies: PricingTierFrequency[];
  tiers: GnomiePricingTier[];
  sectionId: string;
}
