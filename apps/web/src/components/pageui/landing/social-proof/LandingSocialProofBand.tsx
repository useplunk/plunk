import {cn} from '../../shared/cn';

/**
 * Highlights important features, milestones or testimonials of your product.
 *
 * Use this to highlight key features or social proof. This is usually placed at the top of the page, but you can also use it in between sections or below your primary CTA.
 */
export const LandingSocialProofBand = ({
  className,
  id,
  invert,
  children,
  variant = 'default',
}: {
  className?: string;
  id?: string;
  invert?: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary';
}) => {
  return (
    <div
      id={id}
      className={cn(
        'w-full py-2',
        !invert && variant === 'primary'
          ? 'bg-primary-100 dark:bg-primary-900'
          : '',
        !invert && variant === 'secondary'
          ? 'bg-secondary-100 dark:bg-secondary-900'
          : '',
        !invert && variant === 'default'
          ? 'bg-slate-200 dark:bg-slate-900'
          : '',
        invert && variant === 'primary'
          ? 'bg-primary-900 dark:bg-primary-100'
          : '',
        invert && variant === 'secondary'
          ? 'bg-secondary-900 dark:bg-secondary-100'
          : '',
        invert && variant === 'default' ? 'bg-slate-700 dark:bg-slate-300' : '',
        className,
      )}
    >
      <div
        className={cn(
          'w-full max-w-7xl mx-auto flex items-center md:justify-center gap-8 px-8 overflow-auto no-scrollbar',
          invert
            ? 'text-gray-200 dark:text-gray-600'
            : 'text-gray-700 dark:text-gray-200',
        )}
      >
        {children}
      </div>
    </div>
  );
};
