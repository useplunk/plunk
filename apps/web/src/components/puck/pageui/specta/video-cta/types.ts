export interface SpectaAvatarItem {
  imageSrc: string;
  name: string;
}

export interface SpectaVideoCtaProps {
  eyebrow: string;
  title: string;
  description: string;
  videoSrc: string;
  autoPlay: boolean;
  controls: boolean;
  withBackground: boolean;
  showPrimaryCta: boolean;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  showSocialProof: boolean;
  showSocialProofRating: boolean;
  showSocialProofAvatars: boolean;
  numberOfUsers: number;
  suffixText: string;
  avatars: SpectaAvatarItem[];
  sectionId: string;
}
