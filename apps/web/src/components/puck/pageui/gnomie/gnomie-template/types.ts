import type {Slot, SlotComponent} from '@puckeditor/core';

export type GnomieTemplateProps = {
  content: Slot;
};

export type GnomieTemplateRenderProps = Omit<GnomieTemplateProps, 'content'> & {
  content: SlotComponent;
};
