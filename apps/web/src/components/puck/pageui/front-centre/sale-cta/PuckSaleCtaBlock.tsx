import {LandingSaleCtaSection} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import type {PageUiSaleCtaProps} from './types';

export function PuckSaleCtaBlock(props: PageUiSaleCtaProps) {
  return (
    <LandingSaleCtaSection
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      description={props.description}
      ctaHref={props.ctaHref}
      ctaLabel={props.showCta ?? true ? props.ctaLabel : undefined}
      secondaryCtaHref={props.secondaryCtaHref}
      secondaryCtaLabel={props.showSecondaryCta ? props.secondaryCtaLabel : undefined}
      withBackgroundGlow={props.withBackgroundGlow}
    />
  );
}
