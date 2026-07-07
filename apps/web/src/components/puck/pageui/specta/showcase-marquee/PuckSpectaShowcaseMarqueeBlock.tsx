import {LandingMarquee, LandingShowcase} from '../../../../pageui/landing';
import {PageUiImage as Image} from '../../../../pageui/shared/Image';
import {SpectaEyebrow, SpectaTitle} from '../shared/SpectaEyebrow';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaShowcaseMarqueeProps, SpectaShowcaseMarqueeRow} from './types';

function renderMarqueeRow(row: SpectaShowcaseMarqueeRow, keyPrefix: string) {
  return (
    <LandingMarquee
      animationDurationInSeconds={row.animationDurationInSeconds}
      animationDirection={row.animationDirection}
      variant="secondary"
    >
      {row.images.map((image, index) => (
        <Image
          key={`${keyPrefix}-${index}`}
          src={image.imageSrc}
          alt={image.alt}
          className="w-full h-full object-cover mx-4"
          width={500}
          height={500}
        />
      ))}
    </LandingMarquee>
  );
}

export function PuckSpectaShowcaseMarqueeBlock(props: SpectaShowcaseMarqueeProps) {
  return (
    <section id={normalizeSectionId(props.sectionId)}>
      <LandingShowcase
        className={props.showcaseClassName}
        variant="secondary"
        titleComponent={
          <>
            <SpectaEyebrow text={props.eyebrow} />
            <SpectaTitle text={props.title} />
          </>
        }
        description={props.description}
      />

      {renderMarqueeRow(props.topRow, 'top-row')}
      {renderMarqueeRow(props.bottomRow, 'bottom-row')}
    </section>
  );
}
