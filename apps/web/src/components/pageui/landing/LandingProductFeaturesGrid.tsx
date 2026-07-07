import { GlowBg } from '../shared/glow-bg';
import {cn} from '../shared/cn';
import { Children } from 'react';

/**
 * A component meant to be used in the landing page.
 * It displays a title, description and a grid of LandingProductFeature and/or LandingProductVideoFeature (in any combination, passed as children).
 */
export const LandingProductFeaturesGrid = ({
  className,
  children,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  withBackground = true,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
  containerType = 'ultrawide',
  numberOfColumns,
}: {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
  containerType?: 'narrow' | 'wide' | 'ultrawide';
  numberOfColumns?: number;
}) => {
  const childrenCount = Children.count(children);

  return (
    <section
      id={id}
      className={cn(
        'w-full flex justify-center items-center gap-8 p-6 py-12 lg:py-16 flex-col',
        withBackground && variant === 'primary'
          ? 'bg-primary-100/20 dark:bg-primary-900/10'
          : '',
        withBackground && variant === 'secondary'
          ? 'bg-secondary-100/20 dark:bg-secondary-900/10'
          : '',
        withBackgroundGlow ? 'relative overflow-hidden' : '',
        className,
      )}
    >
      {withBackgroundGlow ? (
        <div className="hidden lg:flex justify-center w-full h-full absolute -bottom-1/2 pointer-events-none">
          <GlowBg
            className={cn('w-full lg:w-2/3 h-auto z-0')}
            variant={backgroundGlowVariant}
          />
        </div>
      ) : null}

      {title || description || titleComponent || descriptionComponent ? (
        <div
          className={cn(
            'relative w-full flex flex-col sm:items-center',
            `container-${containerType}`,
          )}
        >
          {titleComponent ||
            (title && (
              <h2 className="w-full text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight md:leading-tight max-w-sm sm:max-w-none">
                {title}
              </h2>
            ))}

          {descriptionComponent ||
            (description && (
              <p className="w-full mt-6 md:text-xl">{description}</p>
            ))}
        </div>
      ) : null}

      <div
        className={cn(
          '!p-0 relative isolate grid gap-4 fgrid',
          variant,
          `container-${containerType}`,
          !numberOfColumns && childrenCount % 3 === 0
            ? 'md:grid-cols-3'
            : 'md:grid-cols-2',
          numberOfColumns === 1 && 'md:grid-cols-1',
          numberOfColumns === 2 && 'md:grid-cols-2',
          numberOfColumns === 3 && 'md:grid-cols-3',
        )}
      >
        {children}
      </div>
    </section>
  );
};
