import {
  LandingProductFeature,
  LandingProductFeatureKeyPoints,
} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import {PageUiButton} from '../../../../pageui/shared';
import type {PageUiProductFeatureProps} from './types';

export function PuckProductFeatureBlock(props: PageUiProductFeatureProps) {
  return (
    <LandingProductFeature
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      descriptionComponent={
        <>
          {props.showKeyPoints ?? true ? (
            <LandingProductFeatureKeyPoints keyPoints={props.keyPoints} />
          ) : null}
          {props.showCta ?? true ? (
            <PageUiButton className="mt-8" asChild>
              <a href={props.ctaHref}>{props.ctaLabel}</a>
            </PageUiButton>
          ) : null}
          {(props.showCta ?? true) && (props.showCtaNote ?? true) ? (
            <p className="text-sm">{props.ctaNote}</p>
          ) : null}
        </>
      }
      imageSrc={props.showImage ?? true ? props.imageSrc : undefined}
      imageAlt={props.imageAlt}
      imagePosition={props.imagePosition}
      imagePerspective={props.imagePerspective}
    />
  );
}
