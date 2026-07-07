import {cn} from '../../shared/cn';
import {PageUiImage as Image} from '../../shared/Image';
import { GlowBg } from '../../shared/glow-bg';
import { VideoPlayer } from '../../shared/VideoPlayer';
import { forwardRef } from 'react';

/**
 * A simple CSS mask component that fades content top and bottom to transparent
 */
export const FadeMask = forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
    fadeHeight?: string;
  }
>(({ children, className, fadeHeight = '3rem' }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('overflow-hidden', className)}
      style={{
        maskImage: `linear-gradient(to bottom, transparent 0%, black ${fadeHeight}, black calc(100% - ${fadeHeight}), transparent 100%)`,
        WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, black ${fadeHeight}, black calc(100% - ${fadeHeight}), transparent 100%)`,
      }}
    >
      {children}
    </div>
  );
});

FadeMask.displayName = 'FadeMask';

const LandingPrimaryCtaContent = ({
  className,
  childrenClassName,
  textPosition = 'left',
  title,
  titleComponent,
  description,
  descriptionComponent,
  leadingComponent,
  children,
}: {
  className?: string;
  childrenClassName?: string;
  textPosition?: 'center' | 'left';
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  leadingComponent?: React.ReactNode;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        textPosition === 'center'
          ? 'items-center text-center'
          : 'justify-center',
        className,
      )}
    >
      {leadingComponent}

      {titleComponent ||
        (title && (
          <h1 className="text-2xl md:text-3xl lg:text-4xl leading-tight font-semibold md:max-w-2xl">
            {title}
          </h1>
        ))}

      {descriptionComponent ||
        (description && (
          <p className="md:text-lg md:max-w-xl">{description}</p>
        ))}

      <div
        className={cn(
          'flex flex-wrap gap-4 mt-2',
          textPosition === 'center' ? 'justify-center' : 'justify-start',
          childrenClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * A component meant to be used in the landing page as the primary Call to Action section.
 *
 * A section that shows a title, description and an image.
 * Optionally, it can have actions (children), leading components and a background glow.
 */
export const LandingPrimaryImageCtaSection = ({
  children,
  className,
  innerClassName,
  title,
  titleComponent,
  description,
  descriptionComponent,
  leadingComponent,
  footerComponent,
  textPosition = 'left',
  imageSrc,
  imageAlt = '',
  imagePosition = 'right',
  imagePerspective = 'none',
  imageShadow = 'hard',
  minHeight = 350,
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
  effectComponent,
  effectClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  leadingComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
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
  minHeight?: number;
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
  effectComponent?: React.ReactNode;
  effectClassName?: string;
}) => {
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
        withBackgroundGlow || imagePerspective !== 'none'
          ? 'relative overflow-hidden'
          : '',
        imagePerspective === 'paper' ? 'md:pb-24' : '',
        className,
      )}
    >
      {effectComponent ? (
        <FadeMask
          className={cn(
            'absolute inset-0 h-full w-full pointer-events-none opacity-50',
            effectClassName,
          )}
          fadeHeight="4rem"
          aria-hidden="true"
        >
          {effectComponent}
        </FadeMask>
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
          'w-full p-6 gap-8 relative',
          imagePosition === 'center'
            ? 'flex flex-col container-narrow'
            : 'grid lg:grid-cols-2 max-w-full container-wide items-center',
          textPosition === 'center' ? 'items-center' : 'items-start',
          innerClassName,
        )}
        style={{
          minHeight,
        }}
      >
        <LandingPrimaryCtaContent
          className={cn(
            'relative z-10',
            imagePosition === 'left' && 'lg:col-start-2 lg:row-start-1',
          )}
          title={title}
          titleComponent={titleComponent}
          description={description}
          descriptionComponent={descriptionComponent}
          textPosition={textPosition}
          leadingComponent={leadingComponent}
        >
          {children}
        </LandingPrimaryCtaContent>

        {imageSrc ? (
          <>
            {imagePosition === 'center' ? (
              <section className={cn('w-full mt-6 md:mt-8')}>
                <Image
                  className={cn(
                    'w-full rounded-md overflow-hidden',
                    imageShadow === 'soft' && 'shadow-md',
                    imageShadow === 'hard' && 'hard-shadow',
                  )}
                  src={imageSrc}
                  alt={imageAlt}
                  width={1000}
                  height={1000}
                />
              </section>
            ) : null}

            {imagePosition === 'left' || imagePosition === 'right' ? (
              <Image
                className={cn(
                  'w-full rounded-md relative z-10',
                  imageShadow === 'soft' && 'shadow-md',
                  imageShadow === 'hard' && 'hard-shadow',
                  imagePerspective === 'left' && 'lg:perspective-left',
                  imagePerspective === 'right' && 'lg:perspective-right',
                  imagePerspective === 'bottom' && 'lg:perspective-bottom',
                  imagePerspective === 'bottom-lg' &&
                    'lg:perspective-bottom-lg',
                  imagePerspective === 'paper' &&
                    'lg:ml-[7%] lg:perspective-paper',
                  imagePerspective === 'none' ? 'my-4' : 'my-8',
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

      {footerComponent}
    </section>
  );
};

/**
 * A component meant to be used in the landing page as the primary Call to Action section.
 *
 * A section that shows a title, description and a video.
 * Optionally, it can have actions (children), leading components and a background glow.
 */
export const LandingPrimaryVideoCtaSection = ({
  children,
  className,
  innerClassName,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  leadingComponent,
  footerComponent,
  textPosition = 'left',
  videoSrc,
  videoPoster,
  videoPosition = 'right',
  videoMaxWidth = 'none',
  videoShadow = 'hard',
  muted = true,
  autoPlay = false,
  controls = false,
  loop = false,
  minHeight = 350,
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
  effectComponent,
  effectClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  leadingComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  textPosition?: 'center' | 'left';
  videoSrc?: string;
  videoPoster?: string;
  videoPosition?: 'left' | 'right' | 'center';
  videoMaxWidth?: string;
  videoShadow?: 'none' | 'soft' | 'hard';
  muted?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  minHeight?: number;
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
  effectComponent?: React.ReactNode;
  effectClassName?: string;
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
      {effectComponent ? (
        <FadeMask
          className={cn(
            'absolute inset-0 h-full w-full pointer-events-none opacity-50',
            effectClassName,
          )}
          fadeHeight="4rem"
          aria-hidden="true"
        >
          {effectComponent}
        </FadeMask>
      ) : null}

      <div
        className={cn(
          'w-full p-6 flex flex-col gap-8 relative z-10',
          videoPosition === 'center'
            ? 'container-narrow'
            : 'max-w-full container-wide grid lg:grid-cols-2 items-center',
          textPosition === 'center' ? 'items-center' : 'items-start',
          innerClassName,
        )}
        style={{
          minHeight,
        }}
      >
        <LandingPrimaryCtaContent
          className={cn(
            'relative z-10',
            videoPosition === 'left' && 'lg:col-start-2 lg:row-start-1',
          )}
          title={title}
          titleComponent={titleComponent}
          description={description}
          descriptionComponent={descriptionComponent}
          textPosition={textPosition}
          leadingComponent={leadingComponent}
        >
          {children}
        </LandingPrimaryCtaContent>

        {videoSrc ? (
          <>
            {withBackgroundGlow ? (
              <div className="hidden lg:flex justify-center w-full h-full absolute pointer-events-none">
                <GlowBg
                  className={cn(
                    'w-full lg:w-1/2 h-auto z-0 dark:opacity-50',
                    videoPosition === 'center' ? 'top-5' : ' -top-1/3',
                  )}
                  variant={backgroundGlowVariant}
                />
              </div>
            ) : null}

            {videoPosition === 'center' ? (
              <section className={cn('w-full mt-6 md:mt-8')}>
                <VideoPlayer
                  className={cn(
                    'w-full rounded-md overflow-hidden',
                    videoShadow === 'soft' && 'shadow-md',
                    videoShadow === 'hard' && 'hard-shadow',
                  )}
                  poster={videoPoster}
                  src={videoSrc}
                  autoPlay={autoPlay}
                  controls={controls}
                  loop={loop}
                  muted={muted}
                  maxWidth={videoMaxWidth}
                  variant={variant}
                />
              </section>
            ) : null}

            {videoPosition === 'left' || videoPosition === 'right' ? (
              <VideoPlayer
                className={cn(
                  'w-full rounded-md overflow-hidden',
                  videoShadow === 'soft' && 'shadow-md',
                  videoShadow === 'hard' && 'hard-shadow',
                )}
                poster={videoPoster}
                src={videoSrc}
                autoPlay={autoPlay}
                controls={controls}
                loop={loop}
                muted={muted}
                maxWidth={videoMaxWidth}
                variant={variant}
              />
            ) : null}
          </>
        ) : null}
      </div>

      {footerComponent}
    </section>
  );
};

/**
 * A component meant to be used in the landing page as the primary Call to Action section.
 *
 * A section that shows a title & description.
 * Optionally, it can have actions (children) and a background.
 */
export const LandingPrimaryTextCtaSection = ({
  children,
  className,
  innerClassName,
  title,
  titleComponent,
  description,
  descriptionComponent,
  leadingComponent,
  footerComponent,
  textPosition = 'center',
  withBackground = false,
  withBackgroundGlow = false,
  variant = 'primary',
  backgroundGlowVariant = 'primary',
  effectComponent,
  effectClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  leadingComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  textPosition?: 'center' | 'left';
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
  effectComponent?: React.ReactNode;
  effectClassName?: string;
}) => {
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
        className,
      )}
    >
      {effectComponent ? (
        <FadeMask
          className={cn(
            'absolute inset-0 h-full w-full pointer-events-none opacity-50',
            effectClassName,
          )}
          fadeHeight="4rem"
          aria-hidden="true"
        >
          {effectComponent}
        </FadeMask>
      ) : null}

      {withBackgroundGlow ? (
        <div className="hidden lg:flex justify-center w-full h-full absolute pointer-events-none">
          <GlowBg
            className={cn(
              'w-full lg:w-1/2 h-auto z-0 dark:opacity-50',
              textPosition === 'center' ? 'top-5' : ' -top-1/3',
            )}
            variant={backgroundGlowVariant}
          />
        </div>
      ) : null}

      <div
        className={cn(
          'w-full p-6 flex flex-col gap-8 relative z-10',
          textPosition === 'center'
            ? 'container-narrow'
            : 'max-w-full container-wide',
          textPosition === 'center' ? 'items-center' : 'items-start',
          innerClassName,
        )}
      >
        <LandingPrimaryCtaContent
          className={cn(
            textPosition === 'center' ? 'items-center' : 'items-start',
          )}
          childrenClassName={cn(
            textPosition === 'center' ? 'items-center' : '',
          )}
          title={title}
          titleComponent={titleComponent}
          description={description}
          descriptionComponent={descriptionComponent}
          textPosition={textPosition}
          leadingComponent={leadingComponent}
        >
          {children}
        </LandingPrimaryCtaContent>
      </div>

      {footerComponent}
    </section>
  );
};
