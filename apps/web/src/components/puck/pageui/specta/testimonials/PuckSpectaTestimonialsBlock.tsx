import {
  LandingTestimonialGrid,
  LandingTestimonialReadMoreWrapper,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaTestimonialsProps} from './types';

export function PuckSpectaTestimonialsBlock(props: SpectaTestimonialsProps) {
  return (
    <LandingTestimonialReadMoreWrapper size={props.readMoreSize}>
      <LandingTestimonialGrid
        id={normalizeSectionId(props.sectionId)}
        title={props.title}
        description={props.description}
        testimonialItems={props.testimonials}
        withBackground={props.withBackground}
        withBackgroundGlow={props.withBackgroundGlow}
        variant="secondary"
        backgroundGlowVariant="secondary"
      />
    </LandingTestimonialReadMoreWrapper>
  );
}
