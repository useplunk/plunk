export interface SpectaAvatarItem {
  imageSrc: string;
  name: string;
}

export interface SpectaSaleCtaProps {
  eyebrow: string;
  title: string;
  description: string;
  showCta: boolean;
  ctaHref: string;
  ctaLabel: string;
  showSocialProof: boolean;
  showSocialProofRating: boolean;
  showSocialProofAvatars: boolean;
  numberOfUsers: number;
  suffixText: string;
  socialProofFooter: string;
  avatars: SpectaAvatarItem[];
  withBackground: boolean;
  withBackgroundGlow: boolean;
  sectionId: string;
}
