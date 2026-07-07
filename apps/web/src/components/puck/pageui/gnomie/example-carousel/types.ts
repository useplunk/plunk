import type {ExampleCarouselSocial} from '../../../../pageui/landing';

export interface GnomieExampleCarouselItem {
  imageSrc: string;
  name: string;
  location: string;
  socials: Array<ExampleCarouselSocial | {platform: ExampleCarouselSocial}>;
}

export interface GnomieExampleCarouselProps {
  title: string;
  description: string;
  items: GnomieExampleCarouselItem[];
  showHeaderCta: boolean;
  headerCtaLabel: string;
  headerCtaHref: string;
  showSocialProof: boolean;
  showSocialProofRating: boolean;
  showSocialProofAvatars: boolean;
  numberOfUsers: number;
  suffixText: string;
  avatars: Array<{imageSrc: string; name: string}>;
  showCtaCard: boolean;
  ctaLabel: string;
  ctaHref: string;
  ctaNote: string;
  ctaNoteSecondary: string;
  sectionId: string;
}
