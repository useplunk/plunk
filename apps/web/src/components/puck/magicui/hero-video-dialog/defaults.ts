import type {HeroVideoDialogPuckProps} from './types';

const DEFAULT_VIDEO_SRC = 'https://www.youtube.com/embed/qh3NGpYRG3I?si=4rb-zSdDkVK9qxxb';
const DEFAULT_THUMBNAIL_LIGHT = 'https://startup-template-sage.vercel.app/hero-light.png';
const DEFAULT_THUMBNAIL_DARK = 'https://startup-template-sage.vercel.app/hero-dark.png';

export function createDefaultHeroVideoDialog(): HeroVideoDialogPuckProps {
  return {
    videoSrc: DEFAULT_VIDEO_SRC,
    thumbnailSrc: DEFAULT_THUMBNAIL_LIGHT,
    thumbnailAlt: 'Hero Video',
    animationStyle: 'from-center',
    dualTheme: true,
    thumbnailSrcDark: DEFAULT_THUMBNAIL_DARK,
    align: 'center',
    rounded: true,
  };
}

export {
  DEFAULT_THUMBNAIL_DARK,
  DEFAULT_THUMBNAIL_LIGHT,
  DEFAULT_VIDEO_SRC,
};
