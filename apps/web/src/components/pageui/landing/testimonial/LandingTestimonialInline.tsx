import {cn} from '../../shared/cn';

/**
 * A component meant to be used in the landing page.
 * It displays a grid of short testimonials.
 */
export const LandingTestimonialInline = ({
  className,
  children,
  withBackground = false,
  variant = 'primary',
  containerType = 'wide',
  id,
}: {
  className?: string;
  children?: React.ReactNode;
  withBackground?: boolean;
  variant?: 'primary' | 'secondary';
  containerType?: 'narrow' | 'wide' | 'ultrawide';
  id?: string;
}) => {
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
        className,
      )}
    >
      <div
        className={cn(
          '!p-0 relative isolate w-full flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-ellipsis',
          `container-${containerType}`,
        )}
      >
        {children}
      </div>
    </section>
  );
};
