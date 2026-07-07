import {cn} from '../../shared/cn';
import {
  LandingAvatar,
  SocialProofItem,
} from '../social-proof/LandingAvatar';
import {LandingRating} from '../rating/LandingRating';

export const getFormattedNumberOfUsers = (numberOfUsers: number) => {
  if (numberOfUsers >= 1000000) {
    const millions = numberOfUsers / 1000000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }

  if (numberOfUsers >= 1000) {
    const thousands = numberOfUsers / 1000;
    return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
  }

  return `${numberOfUsers}`;
};

/**
 * Shows social proof with avatars, number of users and an optional rating.
 *
 * Use this to show proof of existing, happy customers & increase trust.
 */
export const LandingSocialProof = ({
  children,
  className,
  avatarItems,
  numberOfUsers = 169,
  suffixText = 'happy users',
  showRating,
  showAvatars = true,
  disableAnimation,
  size = 'medium',
}: {
  children?: React.ReactNode;
  className?: string;
  avatarItems: SocialProofItem[];
  numberOfUsers: number;
  suffixText?: string;
  showRating?: boolean;
  showAvatars?: boolean;
  disableAnimation?: boolean;
  size?: 'small' | 'medium' | 'large';
}) => {
  const numberText = getFormattedNumberOfUsers(numberOfUsers);

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {showAvatars ? (
        <div className={cn('group/proof flex gap-1')}>
          {avatarItems.map((avatarItem, index) => (
            <LandingAvatar
              key={index}
              size={size === 'small' ? 'medium' : size}
              imageSrc={avatarItem.imageSrc}
              name={avatarItem.name}
              className={cn(
                'relative',
                !disableAnimation
                  ? 'md:group-hover/proof:-ml-0.5 transition-all duration-300'
                  : '',
                index === 1 || index === 2 ? `-ml-4` : '',
                index === 3 ? `-ml-5` : '',
                index > 3 ? `-ml-6` : '',
              )}
            />
          ))}

          <div
            className={cn(
              !disableAnimation
                ? 'md:group-hover/proof:-ml-0.5 transition-all duration-300'
                : '',
              size === 'small' || size === 'medium' ? 'h-9 w-9 text-xs' : '',
              size === 'large' ? 'h-12 w-12 text-xs' : '',
              'relative flex items-center justify-center rounded-full border-2 border-solid border-primary-100 -ml-5 bg-primary-100 text-gray-900 dark:text-gray-900',
            )}
          >
            {numberText}+
          </div>
        </div>
      ) : null}

      <div className="flex flex-col justify-center gap-1">
        {showRating ? <LandingRating size={size} /> : null}

        {!children ? (
          <p
            className={cn(
              'max-w-sm',
              size === 'small' || size === 'medium' ? 'text-xs' : '',
              size === 'large' ? 'text-base' : '',
            )}
          >
            from {numberText}+ {suffixText}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
