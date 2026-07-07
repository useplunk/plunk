import {
  LandingTestimonialGrid,
  LandingTestimonialReadMoreWrapper,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {GnomieTestimonialsProps} from './types';

export function PuckGnomieTestimonialsBlock(props: GnomieTestimonialsProps) {
  return (
    <LandingTestimonialReadMoreWrapper size={props.readMoreSize}>
      <LandingTestimonialGrid
        id={normalizeSectionId(props.sectionId)}
        title={props.title}
        description={props.description}
        testimonialItems={props.testimonials}
      />
    </LandingTestimonialReadMoreWrapper>
  );
}
