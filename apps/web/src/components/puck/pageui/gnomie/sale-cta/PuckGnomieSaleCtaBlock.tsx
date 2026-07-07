import {LandingSaleCtaSection, LandingSocialProof} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {GnomieSaleCtaProps} from './types';

export function PuckGnomieSaleCtaBlock(props: GnomieSaleCtaProps) {
  return (
    <LandingSaleCtaSection
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
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
              size="medium"
              disableAnimation
            />
          ) : null}
        </>
      }
      ctaHref={props.showCta ? props.ctaHref : undefined}
      ctaLabel={props.showCta ? props.ctaLabel : undefined}
      variant="secondary"
    />
  );
}
