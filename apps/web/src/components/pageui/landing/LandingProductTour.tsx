'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import {cn} from '../shared/cn';
import {GlowBg} from '../shared/glow-bg';

interface LandingProductTourProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  className?: string;
  title?: string;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  withBackground?: boolean;
  withBackgroundGlow?: boolean;
  variant?: 'primary' | 'secondary';
  backgroundGlowVariant?: 'primary' | 'secondary';
}

const LandingProductTourSection = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  LandingProductTourProps
>(
  (
    {
      className,
      title,
      titleComponent,
      description,
      descriptionComponent,
      withBackground = false,
      withBackgroundGlow = false,
      variant = 'primary',
      backgroundGlowVariant = 'primary',
      ...props
    },
    ref,
  ) => (
    <section
      className={cn(
        'relative w-full flex flex-col justify-center items-center gap-8 p-6 py-12 lg:py-16',
        withBackground && variant === 'primary' ? 'bg-primary-100/20 dark:bg-primary-900/10' : '',
        withBackground && variant === 'secondary' ? 'bg-secondary-100/20 dark:bg-secondary-900/10' : '',
        withBackgroundGlow ? 'relative overflow-hidden' : '',
        className,
      )}
    >
      {withBackgroundGlow ? (
        <div className="hidden lg:flex justify-center w-full h-full absolute -bottom-1/2 pointer-events-none">
          <GlowBg className="w-full lg:w-2/3 h-auto z-0" variant={backgroundGlowVariant} />
        </div>
      ) : null}

      <div className={cn('container-wide w-full')}>
        {titleComponent ||
          (title ? (
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-semibold leading-tight max-w-xs sm:max-w-none fancyHeading">
              {title}
            </h2>
          ) : null)}

        {descriptionComponent ||
          (description ? <p className="mt-6 md:text-xl">{description}</p> : null)}

        <LandingProductTour ref={ref} className="flex gap-8 w-full mt-12" {...props} />
      </div>
    </section>
  ),
);
LandingProductTourSection.displayName = 'LandingProductTourSection';

const LandingProductTour = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({className, ...props}, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    className={cn('flex flex-col lg:flex-row gap-8 w-full', className)}
    {...props}
  />
));
LandingProductTour.displayName = 'LandingProductTour';

const LandingProductTourList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({className, ...props}, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex flex-col items-center rounded-md p-1 text-muted-foreground', className)}
    {...props}
  />
));
LandingProductTourList.displayName = 'LandingProductTourList';

const LandingProductTourTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({className, ...props}, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'rounded-md w-full lg:w-[420px] p-6 text-left ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-neutral-500/10 data-[state=active]:text-foreground',
      className,
    )}
    {...props}
  />
));
LandingProductTourTrigger.displayName = 'LandingProductTourTrigger';

const LandingProductTourContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({className, ...props}, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'w-full max-w-[500px] mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
LandingProductTourContent.displayName = 'LandingProductTourContent';

export {
  LandingProductTourSection,
  LandingProductTour,
  LandingProductTourList,
  LandingProductTourTrigger,
  LandingProductTourContent,
};
