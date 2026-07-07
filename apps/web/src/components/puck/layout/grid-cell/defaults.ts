import type {GridCellPuckProps} from './types';

export function createDefaultGridCellProps(): GridCellPuckProps {
  return {
    width: 'standard',
    content: [],
  };
}

export function gridColumnForWidth(width: GridCellPuckProps['width']): string {
  switch (width) {
    case 'double':
      return 'span 2';
    case 'full':
      return '1 / -1';
    default:
      return 'span 1';
  }
}
