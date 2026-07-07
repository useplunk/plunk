export interface SocialBandAvatar {
  imageSrc: string;
  name: string;
}

export interface PageUiSocialBandProps {
  title: string;
  description: string;
  numberOfUsers: number;
  showRating: boolean;
  showAvatars: boolean;
  avatars: SocialBandAvatar[];
  sectionId: string;
}
