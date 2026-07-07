import type {Slot, SlotComponent} from '@puckeditor/core';

import type {GapSize, GridColumns, MobileLayout} from '../shared/types';

export type GridPuckProps = {
  columns: GridColumns;
  gap: GapSize;
  mobileLayout: MobileLayout;
  content: Slot;
};

export type GridPuckRenderProps = Omit<GridPuckProps, 'content'> & {
  content: SlotComponent;
};
