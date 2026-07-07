import type {SpectaTemplateProps} from './types';
import {createSpectaSlotContent} from './section-content';

export function createDefaultSpectaTemplate(): SpectaTemplateProps {
  return {
    content: createSpectaSlotContent(),
  };
}
