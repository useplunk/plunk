import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../shared-fields';
import {createDefaultSaleCta} from './defaults';
import {PuckSaleCtaBlock} from './PuckSaleCtaBlock';
import type {PageUiSaleCtaProps} from './types';

function buildFields(props: PageUiSaleCtaProps): Fields<PageUiSaleCtaProps> {
  const fields: Record<string, unknown> = {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showCta: yesNo('Show CTA'),
    showSecondaryCta: yesNo('Show secondary CTA'),
    withBackgroundGlow: yesNo('Background glow'),
    sectionId: sectionIdField,
  };

  if (props.showCta) {
    fields.ctaHref = {type: 'text', label: 'CTA URL'};
    fields.ctaLabel = {type: 'text', label: 'CTA label', contentEditable: true};
  }
  if (props.showSecondaryCta) {
    fields.secondaryCtaHref = {type: 'text', label: 'Secondary CTA URL'};
    fields.secondaryCtaLabel = {type: 'text', label: 'Secondary CTA label', contentEditable: true};
  }

  return fields as Fields<PageUiSaleCtaProps>;
}

const defaults = createDefaultSaleCta();

export const pageUiSaleCtaPuckComponent: ComponentConfig<PageUiSaleCtaProps> = {
  label: 'Sale CTA',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = ['showCta', 'showSecondaryCta'].some(
      k => changed[k as keyof PageUiSaleCtaProps],
    );
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as PageUiSaleCtaProps);
  },
  render: props => <PuckSaleCtaBlock {...props} />,
};
