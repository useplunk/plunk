'use client';
import {LandingReadMoreWrapper} from '../LandingReadMoreWrapper';

/**
 * Wraps the testimonial section in the landing page, and adds a "Read more" button (truncates to the given height).
 */
export const LandingTestimonialReadMoreWrapper = ({
  children,
  className,
  size = 'lg',
  variant = 'primary',
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
}) => {
  return (
    <LandingReadMoreWrapper
      size={size}
      variant={variant}
      className={className}
      buttonLabel="Read more testimonials"
    >
      {children}
    </LandingReadMoreWrapper>
  );
};
