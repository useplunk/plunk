import type {Slot, SlotComponent} from '@puckeditor/core';

import type {GridCellWidth} from '../shared/types';

export type GridCellPuckProps = {
  width: GridCellWidth;
  content: Slot;
};

export type GridCellPuckRenderProps = Omit<GridCellPuckProps, 'content'> & {
  content: SlotComponent;
  puck: {dragRef: React.Ref<HTMLDivElement>};
};
