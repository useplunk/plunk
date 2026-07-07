import type {GnomieTemplateRenderProps} from './types';

export function PuckGnomieTemplateBlock({content: Content}: GnomieTemplateRenderProps) {
  return (
    <div className="gnomie-theme w-full min-w-0 overflow-x-hidden flex flex-col items-stretch scroll-smooth min-h-screen bg-white text-neutral-900">
      <Content />
    </div>
  );
}
