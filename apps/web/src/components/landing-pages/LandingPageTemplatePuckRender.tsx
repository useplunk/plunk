import '@puckeditor/core/puck.css';

import type {Data} from '@puckeditor/core';
import {Render} from '@puckeditor/core';
import type {PuckData} from '@plunk/types';
import {cn} from '@plunk/ui';
import {useEffect, useRef, useState} from 'react';

import {puckConfig} from '../../lib/puck/config';
import {normalizePuckData} from '../../lib/puck/normalize-data';

const PREVIEW_WIDTH = 1280;

interface LandingPageTemplatePuckRenderProps {
  data: PuckData;
  className?: string;
}

export function LandingPageTemplatePuckRender({data, className}: LandingPageTemplatePuckRenderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) {
        setScale(width / PREVIEW_WIDTH);
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-16/10 w-full overflow-hidden rounded-md border border-neutral-200 bg-white',
        className,
      )}
    >
      <div
        className="pointer-events-none origin-top-left"
        style={{
          width: PREVIEW_WIDTH,
          transform: `scale(${scale})`,
        }}
      >
        <Render config={puckConfig} data={normalizePuckData(data) as Data} />
      </div>
    </div>
  );
}
