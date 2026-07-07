import type {Slot, SlotComponent} from '@puckeditor/core';

export type SpectaTemplateProps = {
  content: Slot;
};

export type SpectaTemplateRenderProps = Omit<SpectaTemplateProps, 'content'> & {
  content: SlotComponent;
};
