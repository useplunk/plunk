import {LandingRating} from '../rating/LandingRating';
import {cn} from '../../shared/cn';
import {
  CheckCheckIcon,
  ClockIcon,
  GiftIcon,
  RocketIcon,
  TrophyIcon,
  Wand2Icon,
  ZapIcon,
} from 'lucide-react';

/**
 * Shows a social proof/key feature/milestone item with an optional graphic.
 *
 * Meant to be used inside a `LandingSocialProofBand`.
 */
export const LandingSocialProofBandItem = ({
  className,
  graphic = 'checkmark',
  customGraphic,
  children,
  graphicClassName,
}: {
  className?: string;
  graphic?:
    | 'none'
    | 'checkmark'
    | 'gift'
    | 'magic'
    | 'trophy'
    | 'rating'
    | 'zap'
    | 'rocket'
    | 'time';
  customGraphic?: React.ReactNode;
  graphicClassName?: string;
  children: React.ReactNode;
}) => {
  const GRAPHIC_CONFIG = {
    checkmark: { Icon: CheckCheckIcon, color: 'text-green-500' },
    magic: { Icon: Wand2Icon, color: 'text-yellow-500' },
    trophy: { Icon: TrophyIcon, color: 'text-yellow-500' },
    gift: { Icon: GiftIcon, color: 'text-green-500' },
    zap: { Icon: ZapIcon, color: 'text-yellow-500' },
    rocket: { Icon: RocketIcon, color: 'text-green-500' },
    time: { Icon: ClockIcon, color: 'text-green-500' },
  } as const;

  const renderGraphic = () => {
    if (graphic === 'none') return null;

    if (graphic === 'rating') {
      return (
        <LandingRating
          size="small"
          className={cn('mr-1.5', graphicClassName)}
        />
      );
    }

    if (graphic && graphic in GRAPHIC_CONFIG) {
      const { Icon, color } =
        GRAPHIC_CONFIG[graphic as keyof typeof GRAPHIC_CONFIG];
      return (
        <Icon className={cn('w-4 h-4 mr-1.5', color, graphicClassName)} />
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'flex items-center justify-start gap-0.5 shrink-0',
        className,
      )}
    >
      {graphic !== 'none' && !customGraphic && (
        <span className="shrink-0">{renderGraphic()}</span>
      )}

      {customGraphic}

      <span className="text-xs">{children}</span>
    </div>
  );
};
