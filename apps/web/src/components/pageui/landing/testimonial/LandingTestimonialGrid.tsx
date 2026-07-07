import {cn} from '../../shared/cn';
import {TestimonialItem, LandingTestimonial} from './LandingTestimonial';

/**
 * Use this component to display a grid of testimonials.
 * This component accepts a title, description and a list of testimonials.
 * They will be placed in a column layout on small screens, then a 2-column
layout and finally a 3-column layout on large screens.
 *
 * Each testimonial can be featured or not. The featured testimonial will stand out with bigger & bolder text.
 */
export const LandingTestimonialGrid = ({
  className,
  containerClassName,
  id,
  title,
  titleComponent,
  description,
  descriptionComponent,
  testimonialItems,
  featuredTestimonial,
  withBackground,
  variant = 'primary',
  withBackgroundGlow = false,
  backgroundGlowVariant = 'primary',
}: {
  className?: string;
  containerClassName?: string;
  id?: string;
  title?: string | React.ReactNode;
  titleComponent?: React.ReactNode;
  description?: string | React.ReactNode;
  descriptionComponent?: React.ReactNode;
  testimonialItems: Array<TestimonialItem>;
  featuredTestimonial?: TestimonialItem;
  withBackground?: boolean;
  variant?: 'primary' | 'secondary';
  withBackgroundGlow?: boolean;
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
      <div className="w-full p-6 max-w-full container-wide relative flex flex-col items-center">
        {titleComponent || (title && (
          <h2 className="md:text-center text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight md:leading-tight max-w-sm sm:max-w-none">
            {title}
          </h2>
        ))}

        {descriptionComponent || (description && (
          <p className="mt-6 md:text-xl">{description}</p>
        ))}
      </div>

      <div className="relative isolate">
        {withBackgroundGlow ? (
          <>
            <div
              className="absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 transform-gpu overflow-hidden opacity-25 blur-3xl pointer-events-none"
              aria-hidden="true"
            >
              <div
                className={cn(
                  'ml-[max(50%,38rem)] aspect-[1313/771] w-[82.0625rem] bg-gradient-to-tr',
                  backgroundGlowVariant === 'primary'
                    ? 'from-primary-100 to-primary-200'
                    : '',
                  backgroundGlowVariant === 'secondary'
                    ? 'from-secondary-100 to-secondary-200'
                    : '',
                )}
                style={{
                  clipPath:
                    'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                }}
              />
            </div>
            <div
              className="absolute inset-x-0 top-0 -z-10 flex transform-gpu overflow-hidden pt-32 opacity-20 blur-3xl sm:pt-40 xl:justify-end pointer-events-none"
              aria-hidden="true"
            >
              <div
                className={cn(
                  'ml-[-22rem] aspect-[1313/771] w-[82.0625rem] flex-none origin-top-right rotate-[30deg] bg-gradient-to-tr xl:ml-0 xl:mr-[calc(50%-12rem)]',
                  backgroundGlowVariant === 'primary'
                    ? 'from-primary-100 to-primary-200'
                    : '',
                  backgroundGlowVariant === 'secondary'
                    ? 'from-secondary-100 to-secondary-200'
                    : '',
                )}
                style={{
                  clipPath:
                    'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                }}
              />
            </div>
          </>
        ) : null}

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div
            className={cn(
              'mx-auto max-w-2xl xl:mx-0 xl:max-w-none text-sm leading-6 text-gray-900 dark:text-gray-100 columns-1 md:columns-2 xl:columns-3 gap-4',
              containerClassName,
            )}
          >
            {featuredTestimonial ? (
              <LandingTestimonial
                featured
                {...featuredTestimonial}
                className="mb-4 columns-3xl"
              />
            ) : null}

            {testimonialItems.map((testimonial, index) => {
              return (
                <LandingTestimonial
                  className="mb-4"
                  key={index}
                  {...testimonial}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
