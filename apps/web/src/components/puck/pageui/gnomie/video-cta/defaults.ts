import type {GnomieVideoCtaProps} from './types';

export function createDefaultGnomieVideoCta(): GnomieVideoCtaProps {
  return {
    title: 'Beautiful Garden Designs in Minutes',
    description:
      'AI-powered garden design and landscaping. Tailored for your region. No design skills required.',
    videoSrc: 'https://cache.shipixen.com/features/11-pricing-page-builder.mp4',
    autoPlay: true,
    controls: false,
    withBackground: true,
    showPrimaryCta: true,
    primaryCtaLabel: 'Try Gnomie for free',
    primaryCtaHref: '#',
    ctaNote: 'No credit card required',
    showLogo: true,
    sectionId: '',
  };
}
