import {LandingPrimaryVideoCtaSection} from '../../../../pageui/landing';
import {PageUiButton} from '../../../../pageui/shared';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import {GnomieLogoIcon} from '../shared/GnomieLogoIcon';
import type {GnomieVideoCtaProps} from './types';

export function PuckGnomieVideoCtaBlock(props: GnomieVideoCtaProps) {
  return (
    <>
      <LandingPrimaryVideoCtaSection
        id={normalizeSectionId(props.sectionId)}
        title={props.title}
        description={props.description}
        autoPlay={props.autoPlay}
        controls={props.controls}
        textPosition="center"
        videoPosition="center"
        videoSrc={props.videoSrc}
        withBackground={props.withBackground}
        variant="secondary"
        leadingComponent={
          props.showLogo ? (
            <div className="flex items-center">
              <GnomieLogoIcon className="h-24 w-auto" />
            </div>
          ) : null
        }
      >
        {props.showPrimaryCta ? (
          <div className="w-full mt-6 flex flex-col justify-center gap-4">
            <PageUiButton size="xl" className="p-7 text-xl" variant="secondary" asChild>
              <a href={props.primaryCtaHref}>{props.primaryCtaLabel}</a>
            </PageUiButton>
            {props.ctaNote ? <p className="text-sm opacity-50">{props.ctaNote}</p> : null}
          </div>
        ) : null}
      </LandingPrimaryVideoCtaSection>

      <div
        className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
        style={{
          backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="a" cx="50%" cy="56.6%" r="50%" fx="50%" fy="56.6%" gradientUnits="userSpaceOnUse"><stop offset="0%" style="stop-color:#8f666f;stop-opacity:0.1"/><stop offset="54.99%" style="stop-color:#6d4a54;stop-opacity:0.1"/><stop offset="100%" style="stop-color:#51363f;stop-opacity:0.1"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#a)"/></svg>`,
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
