import {cloneAvatars, cloneTestimonials, pageUiGrayPlaceholder} from '../front-centre/shared-defaults';

export const SPECTA_PLACEHOLDER_LOGO = pageUiGrayPlaceholder(48, 48);
export const SPECTA_PLACEHOLDER_BACKDROP = pageUiGrayPlaceholder(500, 500);

export function cloneSpectaMarqueeItems(count = 9) {
  return Array.from({length: count}, (_, index) => ({
    imageSrc: SPECTA_PLACEHOLDER_LOGO,
    alt: `Logo ${index + 1}`,
  }));
}

export function cloneSpectaShowcaseItems(count = 9) {
  return Array.from({length: count}, (_, index) => ({
    imageSrc: SPECTA_PLACEHOLDER_LOGO,
    alt: `Integration ${index + 1}`,
  }));
}

export function cloneSpectaShowcaseMarqueeImages(count = 4) {
  return Array.from({length: count}, (_, index) => ({
    imageSrc: SPECTA_PLACEHOLDER_BACKDROP,
    alt: `Screenshot ${index + 1}`,
  }));
}

export function cloneSpectaTestimonialInlineItems() {
  return [
    {
      name: 'John Doe',
      text: "I've already seen a tangible impact on engagement and growth",
      suffix: 'Marketing at Google',
      imageSrc: '',
    },
    {
      name: 'Jane Doe',
      text: 'Best app on the market without a doubt',
      suffix: '',
      imageSrc: '',
    },
    {
      name: 'Alice Doe',
      text: "I've created twenty videos in two days without any issues",
      suffix: 'CEO of Instagram',
      imageSrc: '',
    },
    {
      name: 'Guido Ross',
      text: "I've been able to automate my entire workflow. 6/5 stars",
      suffix: 'DevOps at Meta',
      imageSrc: '',
    },
  ].map(item => ({...item}));
}

export function cloneSpectaKeyPointsCreate() {
  return [
    {
      title: 'Fast',
      description:
        'Create a video in 30 seconds. Invite, share, or embed it anywhere',
    },
    {
      title: 'Efficient',
      description: 'Automate video editing without hassle for you or your team',
    },
    {
      title: 'Customizable',
      description:
        'Add effects to make your videos stand out like never before',
    },
  ].map(k => ({...k}));
}

export function cloneSpectaKeyPointsManage() {
  return [
    {
      title: 'Searchable',
      description: 'Find the perfect clip, every time',
    },
    {
      title: 'Scalable',
      description: 'Import videos from 20+ platforms',
    },
    {
      title: 'Shareable',
      description: 'Easily give everyone on your team access',
    },
  ].map(k => ({...k}));
}

export function cloneSpectaTestimonials() {
  return cloneTestimonials().map((item, index: number) => ({
    ...item,
    text:
      index === 0
        ? "Super simple onboarding, great UX, and an absolute joy to use ✨. I'm really happy that we've found Specta and will absolutely be recommending the product to our audience."
        : item.text,
  }));
}

export {cloneAvatars};
