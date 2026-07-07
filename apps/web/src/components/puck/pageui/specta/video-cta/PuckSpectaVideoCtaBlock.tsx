import {
  LandingPrimaryVideoCtaSection,
  LandingSocialProof,
} from '../../../../pageui/landing';
import {PageUiButton} from '../../../../pageui/shared';
import {SpectaEyebrow, SpectaHeroTitle} from '../shared/SpectaEyebrow';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaVideoCtaProps} from './types';

export function PuckSpectaVideoCtaBlock(props: SpectaVideoCtaProps) {
  return (
    <>
      <LandingPrimaryVideoCtaSection
        id={normalizeSectionId(props.sectionId)}
        titleComponent={<SpectaHeroTitle text={props.title} />}
        description={props.description}
        autoPlay={props.autoPlay}
        controls={props.controls}
        textPosition="center"
        videoPosition="center"
        videoSrc={props.videoSrc}
        withBackground={props.withBackground}
        variant="secondary"
        leadingComponent={<SpectaEyebrow text={props.eyebrow} />}
      >
        {props.showPrimaryCta ? (
          <div className="w-full mt-6 flex justify-center gap-4">
            <PageUiButton size="xl" className="p-7 text-xl" variant="secondary" asChild>
              <a href={props.primaryCtaHref}>{props.primaryCtaLabel}</a>
            </PageUiButton>
          </div>
        ) : null}

        {props.showSocialProof ? (
          <LandingSocialProof
            className="w-full mt-6 justify-center"
            showRating={props.showSocialProofRating}
            showAvatars={props.showSocialProofAvatars}
            numberOfUsers={props.numberOfUsers}
            suffixText={props.suffixText}
            avatarItems={props.avatars}
            size="large"
            disableAnimation
          />
        ) : null}
      </LandingPrimaryVideoCtaSection>

      <div
        className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="a" cx="50%" cy="56.6%" r="50%" fx="50%" fy="56.6%" gradientUnits="userSpaceOnUse"><stop offset="0%" style="stop-color:#064e3b;stop-opacity:0.1"/><stop offset="54.99%" style="stop-color:#047857;stop-opacity:0.1"/><stop offset="100%" style="stop-color:#1e293b;stop-opacity:0.1"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#a)"/></svg>`,
          )}')`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
        aria-hidden
      />
    </>
  );
}
