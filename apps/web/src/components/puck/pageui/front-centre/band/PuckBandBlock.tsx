import {ChromeIcon, FigmaIcon, FramerIcon, GithubIcon} from 'lucide-react';

import {LandingBandSection} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import type {BandIcon, PageUiBandProps} from './types';

const ICON_MAP: Record<BandIcon, React.ComponentType<{className?: string}>> = {
  chrome: ChromeIcon,
  figma: FigmaIcon,
  github: GithubIcon,
  framer: FramerIcon,
};

export function PuckBandBlock({title, description, showIcons, icons, sectionId}: PageUiBandProps) {
  return (
    <LandingBandSection
      id={normalizeSectionId(sectionId)}
      title={title}
      description={description}
      supportingComponent={
        showIcons ?? true ? (
          <>
            {icons.map((item, index) => {
              const Icon = ICON_MAP[item.icon];
              return <Icon key={`${item.icon}-${index}`} className="w-12 h-12" />;
            })}
          </>
        ) : null
      }
    />
  );
}
