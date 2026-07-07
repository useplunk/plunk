import {cn} from '../../shared/cn';
import { PageUiButton } from '../../shared/button';
import { GlowBg } from '../../shared/glow-bg';

/**
 * A component meant to be used in the landing page.
 *
 * A simple section that shows a selling point and call to action button.
 */
export const LandingSaleCtaSection = ({
  children,
  className,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  footerComponent,
  ctaHref = '#',
  ctaLabel,
  secondaryCtaHref = '#',
  secondaryCtaLabel,
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
}: {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
}) => {
  return (
    <section
      id={id}
      className={cn(
        'relative w-full flex flex-col justify-center items-center gap-8 py-12 lg:py-16',
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

      <div className={cn(className, 'w-full p-6 container-narrow')}>
        {titleComponent || (title && (
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight max-w-xs sm:max-w-none fancyHeading">
            {title}
          </h2>
        ))}

        {descriptionComponent || (description && (
          <p className="mt-6 md:text-xl">{description}</p>
        ))}

        <div className="mt-6 flex flex-wrap gap-4 w-full items-center">
          {ctaLabel ? (
            <PageUiButton size="xl" asChild variant={variant} className="shrink-0">
              <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                {ctaLabel}
              </a>
            </PageUiButton>
          ) : null}

          {secondaryCtaLabel ? (
            <PageUiButton
              className="shrink-0"
              size="xl"
              asChild
              variant={
                variant === 'primary' ? 'outlinePrimary' : 'outlineSecondary'
              }
            >
              <a
                href={secondaryCtaHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {secondaryCtaLabel}
              </a>
            </PageUiButton>
          ) : null}

          {children}
        </div>

        {footerComponent}
      </div>
    </section>
  );
};
