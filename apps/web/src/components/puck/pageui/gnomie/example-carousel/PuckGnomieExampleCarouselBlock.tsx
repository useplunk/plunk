import type {ExampleCarouselSocial} from '../../../../pageui/landing';
import {LandingExampleCarousel, LandingSocialProof} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {GnomieExampleCarouselItem, GnomieExampleCarouselProps} from './types';

function normalizeSocials(
  socials: GnomieExampleCarouselItem['socials'],
): ExampleCarouselSocial[] {
  return socials.map(social =>
    typeof social === 'string' ? social : social.platform,
  );
}

export function PuckGnomieExampleCarouselBlock(props: GnomieExampleCarouselProps) {
  return (
    <div id={normalizeSectionId(props.sectionId) || undefined}>
      <LandingExampleCarousel
        title={props.title}
        description={props.description}
        items={props.items.map(item => ({
          ...item,
          socials: normalizeSocials(item.socials),
        }))}
        showHeaderCta={props.showHeaderCta}
        headerCtaLabel={props.headerCtaLabel}
        headerCtaHref={props.headerCtaHref}
        showSocialProof={props.showSocialProof}
        socialProofComponent={
          props.showSocialProof ? (
            <LandingSocialProof
              className="w-full justify-center"
              showRating={props.showSocialProofRating}
              showAvatars={props.showSocialProofAvatars}
              numberOfUsers={props.numberOfUsers}
              suffixText={props.suffixText}
              avatarItems={props.avatars}
              size="medium"
              disableAnimation
            />
          ) : null
        }
        showCtaCard={props.showCtaCard}
        ctaLabel={props.ctaLabel}
        ctaHref={props.ctaHref}
        ctaNote={props.ctaNote}
        ctaNoteSecondary={props.ctaNoteSecondary || undefined}
      />
    </div>
  );
}
