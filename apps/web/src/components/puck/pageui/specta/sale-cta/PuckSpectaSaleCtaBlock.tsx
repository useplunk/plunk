import {LandingSaleCtaSection, LandingSocialProof} from '../../../../pageui/landing';
import {SpectaEyebrow, SpectaTitle} from '../shared/SpectaEyebrow';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaSaleCtaProps} from './types';

export function PuckSpectaSaleCtaBlock(props: SpectaSaleCtaProps) {
  return (
    <LandingSaleCtaSection
      id={normalizeSectionId(props.sectionId)}
      titleComponent={
        <>
          <SpectaEyebrow text={props.eyebrow} />
          <SpectaTitle text={props.title} />
        </>
      }
      descriptionComponent={
        <>
          <p>{props.description}</p>
          {props.showSocialProof ? (
            <LandingSocialProof
              className="w-full mt-6"
              showRating={props.showSocialProofRating}
              showAvatars={props.showSocialProofAvatars}
              numberOfUsers={props.numberOfUsers}
              suffixText={props.suffixText}
              avatarItems={props.avatars}
              disableAnimation
            >
              {props.socialProofFooter ? (
                <p className="text-xs">{props.socialProofFooter}</p>
              ) : null}
            </LandingSocialProof>
          ) : null}
        </>
      }
      ctaHref={props.ctaHref}
      ctaLabel={props.showCta ? props.ctaLabel : undefined}
      withBackground={props.withBackground}
      withBackgroundGlow={props.withBackgroundGlow}
      variant="secondary"
      backgroundGlowVariant="secondary"
    />
  );
}
