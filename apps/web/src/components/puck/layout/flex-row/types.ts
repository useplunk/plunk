import type {Slot, SlotComponent} from '@puckeditor/core';

import type {GapSize, MobileLayout} from '../shared/types';

export type FlexRowPuckProps = {
  wrap: boolean;
  gap: GapSize;
  mobileLayout: MobileLayout;
  content: Slot;
};

export type FlexRowPuckRenderProps = Omit<FlexRowPuckProps, 'content'> & {
  content: SlotComponent;
};
