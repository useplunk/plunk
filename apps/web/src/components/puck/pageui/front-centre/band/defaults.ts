import type {PageUiBandProps} from './types';

export function createDefaultBand(): PageUiBandProps {
  return {
    title: 'Used by the best',
    description: 'Used by Google, Fortune 500 companies and industry leaders worldwide.',
    showIcons: true,
    icons: [
      {icon: 'chrome' as const},
      {icon: 'figma' as const},
      {icon: 'github' as const},
      {icon: 'framer' as const},
    ].map(i => ({...i})),
    sectionId: '',
  };
}
