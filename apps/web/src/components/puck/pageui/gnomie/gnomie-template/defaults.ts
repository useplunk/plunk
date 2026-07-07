import type {GnomieTemplateProps} from './types';
import {createGnomieSlotContent} from './section-content';

export function createDefaultGnomieTemplate(): GnomieTemplateProps {
  return {
    content: createGnomieSlotContent(),
  };
}
