import type {ColumnsPuckProps} from './types';

export function createDefaultColumnsProps(): ColumnsPuckProps {
  return {
    ratio: 'equal',
    gap: 'md',
    mobileLayout: 'stack',
    leftColumn: [],
    rightColumn: [],
  };
}
