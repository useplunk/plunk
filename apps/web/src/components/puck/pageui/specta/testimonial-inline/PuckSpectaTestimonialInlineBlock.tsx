import {
  LandingTestimonialInline,
  LandingTestimonialInlineItem,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaTestimonialInlineProps} from './types';

export function PuckSpectaTestimonialInlineBlock(props: SpectaTestimonialInlineProps) {
  return (
    <LandingTestimonialInline
      id={normalizeSectionId(props.sectionId)}
      withBackground={props.withBackground}
      variant="secondary"
    >
      {props.items.map((item, index) => (
        <LandingTestimonialInlineItem
          key={`inline-testimonial-${index}`}
          name={item.name}
          text={item.text}
          suffix={item.suffix || undefined}
          imageSrc={item.imageSrc || undefined}
        />
      ))}
    </LandingTestimonialInline>
  );
}
