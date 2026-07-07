import React from 'react';
import {cn} from '../shared/cn';

/**
 * A component meant to be used in the landing page.
 * A fullscreen, brand-colored section that displays a title, description and some product logos.
 *
 * It should be used to 'break' page flow & highlight content such as the product's tech features or an important selling point.
 */
export const LandingBandSection = ({
  children,
  className,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  supportingComponent,
  withBackground = true,
  variant = 'primary',
}: {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  supportingComponent?: React.ReactNode;
  withBackground?: boolean;
  variant?: 'primary' | 'secondary';
}) => {
  return (
    <section
      id={id}
      className={cn(
        'w-full flex items-center justify-center p-2 md:p-6 gap-6',
        withBackground && variant === 'primary'
          ? 'bg-primary-100/20 dark:bg-primary-100/60'
          : '',
        withBackground && variant === 'secondary'
          ? 'bg-secondary-100/20 dark:bg-secondary-100/60'
          : '',
        className,
      )}
    >
      <div className="w-full p-6 max-w-full container-wide gap-6 items-center lg:flex lg:flex-row">
        <div
          className={cn(
            'w-full lg:w-auto flex flex-col flex-shrink-0 max-w-lg xl:max-w-3xl',
            withBackground ? 'text-black' : '',
          )}
        >
          {titleComponent || (title && (
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">
              {title}
            </h2>
          ))}

          {descriptionComponent || (description && (
            <p className="text-lg">{description}</p>
          ))}

          {children}
        </div>

        <div
          className={cn(
            'flex gap-8 lg:gap-12 ml-auto mt-12 lg:mt-0 lg:max-w-lg xl:max-w-none flex-shrink',
            withBackground ? 'text-black' : '',
            className,
          )}
        >
          {supportingComponent}
        </div>
      </div>
    </section>
  );
};
