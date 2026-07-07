import type {PageUiSaleCtaProps} from './types';

export function createDefaultSaleCta(): PageUiSaleCtaProps {
  return {
    title: 'Unlock Your Front-End Potential',
    description:
      'Take your development journey to the next level with our comprehensive front-end learning center.',
    showCta: true,
    ctaHref: 'https://gum.co/product',
    ctaLabel: 'Sign up now',
    showSecondaryCta: false,
    secondaryCtaHref: '#',
    secondaryCtaLabel: 'Learn more',
    withBackgroundGlow: true,
    sectionId: '',
  };
}
