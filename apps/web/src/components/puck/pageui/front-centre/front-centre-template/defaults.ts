import type {FrontCentreTemplateProps} from './types';
import {createFrontCentreSlotContent} from './section-content';

export function createDefaultFrontCentreTemplate(): FrontCentreTemplateProps {
  return {
    content: createFrontCentreSlotContent(),
  };
}
