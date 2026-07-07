import {LandingMarquee} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaMarqueeProps} from './types';

export function PuckSpectaMarqueeBlock(props: SpectaMarqueeProps) {
  return (
    <section id={normalizeSectionId(props.sectionId)}>
      <LandingMarquee
        withBackground={props.withBackground}
        variant="secondary"
        animationDurationInSeconds={
          props.animationDurationInSeconds > 0 ? props.animationDurationInSeconds : undefined
        }
        animationDirection={props.animationDirection}
      >
        {props.items.map((item, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`marquee-item-${index}`}
            src={item.imageSrc}
            alt={item.alt}
            className="w-12 h-12 mx-8 object-contain"
          />
        ))}
      </LandingMarquee>
    </section>
  );
}
