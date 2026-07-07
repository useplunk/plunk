import {LandingRating} from '../rating/LandingRating';
import {LandingAvatar} from '../social-proof/LandingAvatar';
import {cn} from '../../shared/cn';

/**
 * Use this component to display a single testimonial inline.
 *
 * Can be used with the `LandingTestimonialInline` component.
 */
export const LandingTestimonialInlineItem = ({
  className,
  imageSrc,
  text,
  name,
  suffix,
}: {
  className?: string;
  imageSrc?: string;
  text: string;
  name: string;
  suffix?: string;
}) => {
  return (
    <div className={cn('flex flex-col lg:text-center', className)}>
      <div className="flex gap-2 items-center lg:justify-center">
        {imageSrc ? (
          <div className="opacity-90 flex-shrink-0">
            <LandingAvatar
              imageSrc={imageSrc}
              name={name}
              size="large"
              className="rounded-full border-2 border-opacity-75"
            />
          </div>
        ) : null}

        <div className="flex flex-col lg:text-center lg:items-center text-xs truncate">
          <LandingRating rating={5} />

          {text ? (
            <p className="w-full mt-2 text-gray-500 truncate" title={text}>
              &quot;{text}&quot;
            </p>
          ) : null}

          <p
            className="w-full text-gray-500 truncate"
            title={`${name}${suffix ? `, ${suffix}` : ''}`}
          >
            <b>{name}</b>
            {suffix ? <>, {suffix}</> : null}
          </p>
        </div>
      </div>
    </div>
  );
};
