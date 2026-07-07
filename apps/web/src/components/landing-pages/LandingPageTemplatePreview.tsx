import {cn} from '@plunk/ui';
import type {PuckData} from '@plunk/types';
import {Layout} from 'lucide-react';
import dynamic from 'next/dynamic';

const LandingPageTemplatePuckRender = dynamic(
  () => import('./LandingPageTemplatePuckRender').then(m => ({default: m.LandingPageTemplatePuckRender})),
  {
    ssr: false,
    loading: () => <div className="aspect-16/10 w-full animate-pulse rounded-md bg-neutral-100" />,
  },
);

interface LandingPageTemplatePreviewProps {
  data?: PuckData;
  className?: string;
}

export function LandingPageTemplatePreview({data, className}: LandingPageTemplatePreviewProps) {
  if (!data) {
    return (
      <div
        className={cn(
          'flex aspect-16/10 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500',
          className,
        )}
      >
        <Layout className="h-8 w-8" />
        <span className="text-sm font-medium">Empty canvas</span>
      </div>
    );
  }

  return <LandingPageTemplatePuckRender data={data} className={className} />;
}
