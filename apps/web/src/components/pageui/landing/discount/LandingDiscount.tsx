import {cn} from '../../shared/cn';
import { GiftIcon } from 'lucide-react';

/**
 * A component meant to be used in the landing page.
 *
 * Use this to show a discount or offer to encourage users to take action, typically used under call to action buttons.
 */
export const LandingDiscount = ({
  className,
  discountValueText = '$200 off',
  discountDescriptionText = '',
  animated = true,
  showIcon = true,
}: {
  className?: string;
  discountValueText: string;
  discountDescriptionText?: string;
  animated?: boolean;
  showIcon?: boolean;
}) => {
  return (
    <p className={cn('flex flex-wrap gap-1 items-center text-sm', className)}>
      <span className="text-green-500 flex gap-1 items-center flex-shrink-0">
        {showIcon ? (
          <GiftIcon
            className={cn(
              'w-5 h-5 relative -top-0.5',
              animated ? 'animate-pulse' : '',
            )}
          />
        ) : null}{' '}
        <span className="font-bold">{discountValueText}</span>
      </span>{' '}
      {discountDescriptionText}
    </p>
  );
};
