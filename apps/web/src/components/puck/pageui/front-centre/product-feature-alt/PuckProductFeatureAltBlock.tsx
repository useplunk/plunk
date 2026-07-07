import {LandingProductFeature} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import {PageUiButton} from '../../../../pageui/shared';
import type {PageUiProductFeatureAltProps} from './types';

export function PuckProductFeatureAltBlock(props: PageUiProductFeatureAltProps) {
  return (
    <LandingProductFeature
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      descriptionComponent={
        <>
          <p>{props.description}</p>
          {props.showCta ?? true ? (
            <PageUiButton className="mt-8" variant="secondary" asChild>
              <a href={props.ctaHref}>{props.ctaLabel}</a>
            </PageUiButton>
          ) : null}
          {(props.showCta ?? true) && (props.showCtaNote ?? true) ? (
            <p className="text-sm">{props.ctaNote}</p>
          ) : null}
        </>
      }
      imageSrc={props.showImage ?? true ? props.imageSrc : undefined}
      withBackground={props.withBackground}
      withBackgroundGlow={props.withBackgroundGlow}
      variant={props.variant}
      backgroundGlowVariant={props.variant}
      imagePosition="center"
      textPosition="center"
    />
  );
}
