export interface GnomieAvatarItem {
  imageSrc: string;
  name: string;
}

export interface GnomieSaleCtaProps {
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
  avatars: GnomieAvatarItem[];
  sectionId: string;
}
