export interface GnomieAvatarItem {
  imageSrc: string;
  name: string;
}

export interface GnomieVideoCtaProps {
  title: string;
  description: string;
  videoSrc: string;
  autoPlay: boolean;
  controls: boolean;
  withBackground: boolean;
  showPrimaryCta: boolean;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  ctaNote: string;
  showLogo: boolean;
  sectionId: string;
}
