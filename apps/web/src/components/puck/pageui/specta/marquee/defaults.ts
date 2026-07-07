import {cloneSpectaMarqueeItems} from '../shared-defaults';
import type {SpectaMarqueeProps} from './types';

export function createDefaultSpectaMarquee(): SpectaMarqueeProps {
  return {
    withBackground: true,
    animationDurationInSeconds: 0,
    animationDirection: 'right',
    items: cloneSpectaMarqueeItems(),
    sectionId: '',
  };
}
