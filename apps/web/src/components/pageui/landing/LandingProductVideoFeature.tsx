import {cn} from '../shared/cn';
import { VideoPlayer } from '../shared/VideoPlayer';
import { GlowBg } from '../shared/glow-bg';

/**
 * A component meant to be used in the landing page.
 * It displays a title, description and video of a product's feature.
 *
 * The video could either be left, right or center (larger).
 * The section can have a background or not.
 */
export const LandingProductVideoFeature = ({
  children,
  className,
  innerClassName,
  textClassName,
  title,
  titleComponent,
  description,
  descriptionComponent,
  leadingComponent,
  textPosition = 'left',
  videoSrc,
  videoPoster,
  videoPosition,
  videoMaxWidth = 'none',
  autoPlay,
  muted = true,
  controls = false,
  loop = false,
  zoomOnHover = false,
  minHeight = 350,
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant,
  effectComponent,
  effectClassName,
  inContainer,
}: {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  textClassName?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  leadingComponent?: React.ReactNode;
  textPosition?: 'center' | 'left';
  videoSrc?: string;
  videoPoster?: string;
  videoPosition?: 'left' | 'right' | 'center';
  videoMaxWidth?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
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
  const isInContainer = inContainer || !videoPosition;
  const defaultVideoPosition =
    videoPosition !== undefined ? videoPosition : 'right';
  const effectiveVideoPosition = isInContainer
    ? 'center'
    : defaultVideoPosition;

  return (
    <section
      className={cn(
        'relative w-full flex flex-col justify-center items-center gap-8 py-12 lg:py-16',
        withBackground && variant === 'primary'
          ? 'bg-primary-100/20 dark:bg-primary-900/10'
          : '',
        withBackground && variant === 'secondary'
          ? 'bg-secondary-100/20 dark:bg-secondary-900/10'
          : '',
        withBackgroundGlow ? 'overflow-hidden' : '',
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

      <div
        className={cn(
          'w-full p-6 flex flex-col items-center relative',
          effectiveVideoPosition === 'center'
            ? 'container-narrow'
            : 'max-w-full container-wide grid lg:grid-cols-12 gap-4 lg:gap-8',
          textPosition === 'center' ? 'items-center' : 'items-start',
          innerClassName,

          // When inside any variant container
          '[.primary_&]:bg-primary-100/20 [.primary_&]:dark:bg-primary-900/10',
          '[.secondary_&]:bg-secondary-100/20 [.secondary_&]:dark:bg-secondary-900/10',

          // When inside a features grid container
          '[.fgrid_&]:p-6 [.fgrid_&]:lg:p-10 [.fgrid_&]:m-0 [.fgrid_&]:lg:m-0 [.fgrid_&]:h-full',

          // When inside a steps container
          '[.steps_&]:m-0 [.steps_&]:lg:m-0 [.steps_&]:h-full [.steps_&]:gap-2',
          '[.steps.sgrid_&]:px-0 [.steps.sgrid_&]:pb-0',
          '[.steps.list_&]:max-w-full [.steps.list_&]:container-wide [.steps.list_&]:p-0 [.steps.list_&]:grid [.steps.list_&]:lg:grid-cols-12 [.steps.list_&]:gap-4 [.steps.list_&]:lg:gap-8',
        )}
        style={{
          minHeight: isInContainer ? 0 : minHeight,
        }}
      >
        <div
          className={cn(
            'w-full flex flex-col gap-2 lg:gap-4',
            effectiveVideoPosition === 'left' &&
              'lg:col-start-7 lg:row-start-1',
            textPosition === 'center'
              ? 'md:max-w-lg xl:max-w-2xl items-center text-center'
              : 'items-start lg:col-span-6',
            textClassName,

            // When inside a steps container
            '[.steps_&]:p-6 [.steps.sgrid_&]:lg:py-6',
            '[.steps.sgrid_&]:pt-0',
            '[.steps.list_&]:pb-0',
            '[.odd_&]:lg:col-start-7 [.odd_&]:lg:row-start-1 [.odd_&]:lg:pr-12',
            '[.even_&]:lg:pl-12',
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

        {withBackgroundGlow ? (
          <div className="hidden lg:flex justify-center w-full h-full absolute pointer-events-none">
            <GlowBg
              className={cn('w-full lg:w-1/2 h-auto z-0')}
              variant={backgroundGlowVariant}
            />
          </div>
        ) : null}

        {videoSrc ? (
          <>
            {effectiveVideoPosition === 'center' ? (
              <section
                className={cn(
                  'w-full mt-auto pt-6 md:pt-8',

                  // When inside a steps container
                  '[.steps_&]:p-0',
                  '[.steps.list_&]:rounded-md [.steps.list_&]:lg:col-span-6 [.steps.list_&]:mt-0',
                )}
              >
                <VideoPlayer
                  className={cn(
                    'w-full rounded-md',
                    zoomOnHover ? 'hover:scale-110 transition-all' : '',
                  )}
                  poster={videoPoster}
                  src={videoSrc}
                  autoPlay={autoPlay}
                  muted={muted}
                  controls={controls}
                  maxWidth={videoMaxWidth}
                  variant={variant}
                  loop={loop}
                />
              </section>
            ) : null}

            {effectiveVideoPosition === 'left' ||
            effectiveVideoPosition === 'right' ? (
              <VideoPlayer
                className={cn(
                  'w-full rounded-md lg:col-span-6',
                  zoomOnHover ? 'hover:scale-110 transition-all' : '',
                )}
                poster={videoPoster}
                src={videoSrc}
                autoPlay={autoPlay}
                muted={muted}
                controls={controls}
                maxWidth={videoMaxWidth}
                variant={variant}
                loop={loop}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
};
