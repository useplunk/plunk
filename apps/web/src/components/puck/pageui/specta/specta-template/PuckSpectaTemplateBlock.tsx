import type {SpectaTemplateRenderProps} from './types';

export function PuckSpectaTemplateBlock({content: Content}: SpectaTemplateRenderProps) {
  return (
    <div className="dark bg-neutral-950 text-white min-h-screen w-full">
      <Content />
    </div>
  );
}
