import {
  LandingProductFeature,
  LandingProductFeatureKeyPoints,
} from '../../../../pageui/landing';
import {PageUiButton} from '../../../../pageui/shared';
import {SpectaEyebrow, SpectaTitle} from '../shared/SpectaEyebrow';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {SpectaProductFeatureProps} from './types';

export function PuckSpectaProductFeatureBlock(props: SpectaProductFeatureProps) {
  return (
    <LandingProductFeature
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
          {props.showKeyPoints ? (
            <LandingProductFeatureKeyPoints
              variant="secondary"
              keyPoints={props.keyPoints}
              className="mt-4"
            />
          ) : null}
          {props.showCta ? (
            <PageUiButton className="mt-8" variant="secondary" asChild>
              <a href={props.ctaHref}>{props.ctaLabel}</a>
            </PageUiButton>
          ) : null}
          {props.showCta && props.showCtaNote ? (
            <p className="text-sm">{props.ctaNote}</p>
          ) : null}
        </>
      }
      imageSrc={props.imageSrc}
      imageAlt={props.imageAlt}
      imagePosition={props.imagePosition}
      imagePerspective="none"
      zoomOnHover={false}
      withBackground
      variant="secondary"
    />
  );
}
