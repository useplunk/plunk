import {
  LandingTestimonialGrid,
  LandingTestimonialReadMoreWrapper,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import type {PageUiTestimonialsProps} from './types';

export function PuckTestimonialsBlock(props: PageUiTestimonialsProps) {
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
