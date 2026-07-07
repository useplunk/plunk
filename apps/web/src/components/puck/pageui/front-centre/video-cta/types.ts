export interface AvatarItem {
  imageSrc: string;
  name: string;
}

export interface PageUiVideoCtaProps {
  title: string;
  description: string;
  videoSrc: string;
  autoPlay: boolean;
  controls: boolean;
  variant: 'primary' | 'secondary';
  withBackground: boolean;
  showPrimaryCta: boolean;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  showSecondaryCta: boolean;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  showDiscount: boolean;
  showDiscountIcon: boolean;
  discountValueText: string;
  discountDescriptionText: string;
  showSocialProof: boolean;
  showSocialProofRating: boolean;
  showSocialProofAvatars: boolean;
  numberOfUsers: number;
  suffixText: string;
  avatars: AvatarItem[];
  sectionId: string;
}
