import {cn} from '../../shared/cn';
import {PageUiImage as Image} from '../../shared/Image';

export interface SocialProofItem {
  imageSrc: string;
  name: string;
}

interface LandingAvatarProps extends SocialProofItem {
  className?: string;
  width?: number;
  height?: number;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
}

/**
 * Shows an avatar image.
 */
export const LandingAvatar = ({
  className,
  imageSrc,
  name,
  width = 128,
  height = 128,
  size = 'medium',
}: LandingAvatarProps) => {
  return (
    <Image
      src={imageSrc}
      alt={name}
      width={width}
      height={height}
      className={cn(
        'rounded-full border-2 border-solid border-primary-100',
        size === 'small' ? 'w-6 h-6' : '',
        size === 'medium' ? 'h-9 w-9' : '',
        size === 'large' ? 'h-12 w-12' : '',
        size === 'xlarge' ? 'h-16 w-16' : '',
        className,
      )}
    />
  );
};
