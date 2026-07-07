import type {FlexRowPuckProps} from './types';

export function createDefaultFlexRowProps(): FlexRowPuckProps {
  return {
    wrap: true,
    gap: 'md',
    mobileLayout: 'stack',
    content: [],
  };
}
