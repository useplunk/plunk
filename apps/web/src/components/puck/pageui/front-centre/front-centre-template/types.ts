import type {Slot, SlotComponent} from '@puckeditor/core';

export type FrontCentreTemplateProps = {
  content: Slot;
};

export type FrontCentreTemplateRenderProps = Omit<FrontCentreTemplateProps, 'content'> & {
  content: SlotComponent;
};
