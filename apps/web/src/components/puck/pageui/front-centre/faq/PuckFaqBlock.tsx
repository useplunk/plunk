import {LandingFaqCollapsibleSection} from '../../../../pageui/landing';
import {normalizeSectionId} from '../shared-fields';
import type {PageUiFaqProps} from './types';

export function PuckFaqBlock(props: PageUiFaqProps) {
  return (
    <LandingFaqCollapsibleSection
      id={normalizeSectionId(props.sectionId)}
      title={props.title}
      description={props.description}
      faqItems={props.faqItems}
      withBackground={props.withBackground}
    />
  );
}
