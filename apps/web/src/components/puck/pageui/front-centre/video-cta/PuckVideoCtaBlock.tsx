import {
  LandingDiscount,
  LandingPrimaryVideoCtaSection,
  LandingSocialProof,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import {PageUiButton} from '../../../../pageui/shared';
import type {PageUiVideoCtaProps} from './types';

export function PuckVideoCtaBlock(props: PageUiVideoCtaProps) {
  const {
    title,
    description,
    videoSrc,
    autoPlay,
    controls,
    variant,
    withBackground,
    showPrimaryCta,
    primaryCtaLabel,
    primaryCtaHref,
    showSecondaryCta,
    secondaryCtaLabel,
    secondaryCtaHref,
    showDiscount,
    showDiscountIcon,
    discountValueText,
    discountDescriptionText,
    showSocialProof,
    showSocialProofRating,
    showSocialProofAvatars,
    numberOfUsers,
    suffixText,
    avatars,
    sectionId,
  } = props;

  return (
    <LandingPrimaryVideoCtaSection
      id={normalizeSectionId(sectionId)}
      title={title}
      description={description}
      autoPlay={autoPlay}
      controls={controls}
      videoPosition="center"
      videoSrc={videoSrc}
      withBackground={withBackground}
      variant={variant}
    >
      {showPrimaryCta ?? true ? (
        <PageUiButton size="xl" variant="secondary" asChild>
          <a href={primaryCtaHref}>{primaryCtaLabel}</a>
        </PageUiButton>
      ) : null}
      {showSecondaryCta ? (
        <PageUiButton size="xl" variant="outlineSecondary">
          <a href={secondaryCtaHref}>{secondaryCtaLabel}</a>
        </PageUiButton>
      ) : null}
      {showDiscount ? (
        <LandingDiscount
          discountValueText={discountValueText}
          discountDescriptionText={discountDescriptionText}
          showIcon={showDiscountIcon ?? true}
        />
      ) : null}
      {showSocialProof ? (
        <LandingSocialProof
          className="w-full mt-12"
          showRating={showSocialProofRating ?? true}
          showAvatars={showSocialProofAvatars ?? true}
          numberOfUsers={numberOfUsers}
          suffixText={suffixText}
          avatarItems={avatars}
        />
      ) : null}
    </LandingPrimaryVideoCtaSection>
  );
}
