import type {GridPuckProps} from './types';

export function createDefaultGridProps(): GridPuckProps {
  return {
    columns: 2,
    gap: 'md',
    mobileLayout: 'stack',
    content: [],
  };
}
