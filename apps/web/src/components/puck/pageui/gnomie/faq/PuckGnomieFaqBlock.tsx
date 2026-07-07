import {LandingFaqCollapsibleSection} from '../../../../pageui/landing';
import {normalizeSectionId} from '../../front-centre/shared-fields';
import type {GnomieFaqProps} from './types';

export function PuckGnomieFaqBlock(props: GnomieFaqProps) {
  return (
    <LandingFaqCollapsibleSection
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      description={props.description}
      faqItems={props.faqItems}
      withBackground={props.withBackground}
      variant="secondary"
    />
  );
}
