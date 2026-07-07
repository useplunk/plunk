import type {PageUiSocialProofBandProps} from './types';

export function createDefaultSocialProofBand(): PageUiSocialProofBandProps {
  return {
    text: 'Sign up today for a 50% discount',
    graphic: 'gift',
    invert: false,
    hiddenOnMobile: true,
    sectionId: '',
  };
}
