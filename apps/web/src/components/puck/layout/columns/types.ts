import type {Slot, SlotComponent} from '@puckeditor/core';

import type {ColumnRatio, GapSize, MobileLayout} from '../shared/types';

export type ColumnsPuckProps = {
  ratio: ColumnRatio;
  gap: GapSize;
  mobileLayout: MobileLayout;
  leftColumn: Slot;
  rightColumn: Slot;
};

export type ColumnsPuckRenderProps = Omit<ColumnsPuckProps, 'leftColumn' | 'rightColumn'> & {
  leftColumn: SlotComponent;
  rightColumn: SlotComponent;
};
