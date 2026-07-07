import {cn} from '../../shared/cn';
import {GlowBg} from '../../shared/glow-bg';

/**
 * A component meant to be used in the landing page.
 * It displays text and a grid of logos/images, optionally showcasing the companies that use the product, integrations etc.
 */
export const LandingShowcase = ({
  children,
  className,
  innerClassName,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  textPosition = 'left',
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
}: {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  textPosition?: 'left' | 'right' | 'center';
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
}) => {
  return (
    <section
      id={id}
      className={cn(
        'w-full flex flex-col justify-center items-center gap-8 py-12 lg:py-16',
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
      <div
        className={cn(
          'grid gap-16 items-center relative container-wide p-6',
          textPosition === 'center' ? 'grid-cols-1' : 'lg:grid-cols-2',
          innerClassName,
        )}
      >
        <div
          className={cn(
            'flex flex-col gap-4',
            textPosition === 'right' && 'order-2 lg:order-1',
            textPosition === 'center' && 'items-center text-center',
          )}
        >
          {titleComponent ||
            (title && (
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight">
                {title}
              </h2>
            ))}

          {descriptionComponent ||
            (description && <p className="mt-4 md:text-xl">{description}</p>)}
        </div>

        {withBackgroundGlow ? (
          <div className="hidden lg:flex justify-center w-full h-full absolute pointer-events-none">
            <GlowBg
              className={cn('w-full lg:w-1/2 h-auto z-0 dark:opacity-50 -top-1/3')}
              variant={backgroundGlowVariant}
            />
          </div>
        ) : null}

        {children ? (
          <div
            className={cn(
              'relative z-10 grid grid-cols-6 md:grid-cols-8 lg:grid-cols-5 2xl:grid-cols-6 gap-4',
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
};
