import {cn} from '../shared/cn';
import {PageUiImage as Image} from '../shared/Image';
import { GlowBg } from '../shared/glow-bg';

/**
 * A component meant to be used in the landing page.
 * It displays a title, description and optionally, an image of a product's feature.
 *
 * The image could either be left, right or center (larger).
 * The image can either be shown in perspective or flat.
 * The section can have a background or not.
 */
export const LandingProductFeature = ({
  children,
  className,
  innerClassName,
  textClassName,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  leadingComponent,
  textPosition = 'left',
  imageSrc,
  imageAlt = '',
  imagePosition,
  imagePerspective = 'bottom',
  imageShadow,
  imageClassName,
  zoomOnHover = true,
  minHeight = 350,
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
  effectComponent,
  effectClassName,
  inContainer,
}: {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  textClassName?: string;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  leadingComponent?: React.ReactNode;
  textPosition?: 'center' | 'left';
  imageSrc?: string;
  imageAlt?: string;
  imagePosition?: 'left' | 'right' | 'center';
  imagePerspective?:
    | 'none'
    | 'left'
    | 'right'
    | 'bottom'
    | 'bottom-lg'
    | 'paper';
  imageShadow?: 'none' | 'soft' | 'hard';
  imageClassName?: string;
  zoomOnHover?: boolean;
  minHeight?: number;
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
  effectComponent?: React.ReactNode;
  effectClassName?: string;
  inContainer?: boolean;
}) => {
  const isInContainer = inContainer || (!imagePosition && !imageShadow);
  const defaultImagePosition =
    imagePosition !== undefined ? imagePosition : 'right';
  const defaultImageShadow = imageShadow !== undefined ? imageShadow : 'hard';
  const effectiveImagePosition = isInContainer
    ? 'center'
    : defaultImagePosition;
  const effectiveImageShadow = isInContainer ? 'none' : defaultImageShadow;

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
        withBackgroundGlow || imagePerspective !== 'none'
          ? 'overflow-hidden'
          : '',
        imagePerspective === 'paper' ? 'md:pb-24' : '',
        className,

        // When inside a features grid container
        '[.fgrid_&]:p-0 [.fgrid_&]:rounded-xl',
        '[.primary.fgrid_&]:fancy-glass',
        '[.secondary.fgrid_&]:fancy-glass-contrast',

        // When inside a steps container
        '[.steps_&]:p-0 [.steps_&]:rounded-xl [.steps_&]:overflow-hidden',
      )}
    >
      {effectComponent ? (
        <div className={cn('absolute inset-0', effectClassName)}>
          {effectComponent}
        </div>
      ) : null}

      {imageSrc && withBackgroundGlow ? (
        <div className="hidden lg:flex justify-center w-full h-full absolute pointer-events-none">
          <GlowBg
            className={cn(
              'w-full lg:w-1/2 h-auto z-0 dark:opacity-50',
              imagePosition === 'center' ? 'top-5' : ' -top-1/3',
              imagePerspective === 'paper' ? 'opacity-70' : 'opacity-100',
            )}
            variant={backgroundGlowVariant}
          />
        </div>
      ) : null}

      <div
        className={cn(
          'w-full p-6 flex flex-col items-center relative',
          effectiveImagePosition === 'center'
            ? 'container-narrow'
            : 'max-w-full container-wide grid gap-4 lg:gap-8 lg:grid-cols-12',
          innerClassName,

          // When inside any variant container
          '[.primary_&]:bg-primary-100/20 [.primary_&]:dark:bg-primary-900/10',
          '[.secondary_&]:bg-secondary-100/20 [.secondary_&]:dark:bg-secondary-900/10',

          // When inside a features grid container
          '[.fgrid_&]:p-6 [.fgrid_&]:lg:p-10 [.fgrid_&]:m-0 [.fgrid_&]:lg:m-0 [.fgrid_&]:h-full',

          // When inside a steps container
          '[.steps_&]:m-0 [.steps_&]:lg:m-0 [.steps_&]:h-full [.steps_&]:gap-2 [.steps.sgrid_&]:px-0 [.steps.sgrid_&]:pb-0',
          '[.steps.list_&]:max-w-full [.steps.list_&]:container-wide [.steps.list_&]:grid [.steps.list_&]:gap-4 [.steps.list_&]:lg:grid-cols-12',
        )}
        style={{
          minHeight: isInContainer ? 0 : minHeight,
        }}
      >
        <div
          className={cn(
            'w-full flex flex-col gap-2 lg:gap-4',
            effectiveImagePosition === 'left' &&
              'lg:col-start-7 lg:row-start-1',
            textPosition === 'center'
              ? 'md:max-w-lg xl:max-w-2xl items-center text-center'
              : 'items-start col-span-12 lg:col-span-6',
            textClassName,

            // When inside a steps container
            '[.steps_&]:lg:p-6',
            '[.steps.sgrid_&]:pb-0 [.steps.sgrid_&]:lg:pb-6 [.steps.sgrid_&]:px-6',
            '[.odd_&]:lg:col-start-7 [.odd_&]:lg:row-start-1',
          )}
        >
          {leadingComponent}

          {titleComponent ||
            (title && (
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight">
                {title}
              </h2>
            ))}

          {descriptionComponent ||
            (description && <p className="mt-4 md:text-xl">{description}</p>)}

          {children}
        </div>

        {imageSrc ? (
          <>
            {effectiveImagePosition === 'center' ? (
              <section
                className={cn(
                  'w-full mt-auto pt-4 md:pt-6 col-span-12',

                  // When inside a steps container
                  '[.steps.list_&]:relative [.steps.list_&]:p-0 [.steps.list_&]:mt-0 [.steps.list_&]:rounded-md [.steps.list_&]:lg:col-span-6',
                  '[.odd_&]:lg:-left-6',
                  '[.even_&]:lg:-right-6',
                )}
              >
                <Image
                  className={cn(
                    'w-full rounded-md overflow-hidden',
                    effectiveImageShadow === 'none' && '!shadow-none',
                    effectiveImageShadow === 'soft' && 'shadow-md',
                    effectiveImageShadow === 'hard' && 'hard-shadow',
                    imageClassName,

                    // When inside a steps container
                    '[.steps_&]:mb-0 [.steps.sgrid_&]:scale-100 [.steps_&]:rounded-xl',
                    '[.steps.list_&]:lg:-mb-12 [.steps.list_&]:lg:-mt-12',
                    '[.steps.sgrid_&]:md:-mt-6',
                  )}
                  src={imageSrc}
                  alt={imageAlt}
                  width={1000}
                  height={1000}
                />
              </section>
            ) : null}

            {effectiveImagePosition === 'left' ||
            effectiveImagePosition === 'right' ? (
              <Image
                className={cn(
                  'relative w-full rounded-md lg:scale-90 col-span-12 lg:col-span-6',
                  zoomOnHover ? 'hover:scale-100 transition-all' : '',
                  effectiveImageShadow === 'none' && '!shadow-none',
                  effectiveImageShadow === 'soft' && 'shadow-md',
                  effectiveImageShadow === 'hard' && 'hard-shadow',
                  effectiveImagePosition === 'left' && 'lg:-left-6',
                  effectiveImagePosition === 'right' && 'lg:-right-6',
                  imagePerspective === 'left' && 'lg:perspective-left',
                  imagePerspective === 'right' && 'lg:perspective-right',
                  imagePerspective === 'bottom' && 'lg:perspective-bottom',
                  imagePerspective === 'bottom-lg' &&
                    'lg:perspective-bottom-lg',
                  imagePerspective === 'paper' && 'lg:perspective-paper',
                  imagePerspective === 'paper' && zoomOnHover
                    ? 'hover:scale-90 transition-all'
                    : '',
                  imagePerspective === 'none' ? 'my-4' : 'my-8',
                  imageClassName,
                )}
                alt={imageAlt}
                src={imageSrc}
                width={1000}
                height={1000}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
};
