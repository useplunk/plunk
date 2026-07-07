import {
  LandingShowcase,
  LandingShowcaseItem,
} from '../../../../pageui/landing';
import {PageUiImage as Image} from '../../../../pageui/shared/Image';
import {SpectaEyebrow, SpectaTitle} from '../shared/SpectaEyebrow';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaShowcaseProps} from './types';

export function PuckSpectaShowcaseBlock(props: SpectaShowcaseProps) {
  return (
    <LandingShowcase
      id={normalizeSectionId(props.sectionId)}
      className={props.className}
      variant="secondary"
      titleComponent={
        <>
          <SpectaEyebrow text={props.eyebrow} className="-mt-12" />
          <SpectaTitle text={props.title} />
        </>
      }
      description={props.description}
    >
      {props.items.map((item, index) => (
        <LandingShowcaseItem key={`showcase-item-${index}`}>
          <Image
            src={item.imageSrc}
            alt={item.alt}
            width={44}
            height={44}
            className="w-11 h-11 object-contain"
          />
        </LandingShowcaseItem>
      ))}
    </LandingShowcase>
  );
}
