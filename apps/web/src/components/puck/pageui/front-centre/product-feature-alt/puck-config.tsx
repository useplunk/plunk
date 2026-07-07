import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../shared-fields';
import {createDefaultProductFeatureAlt} from './defaults';
import {PuckProductFeatureAltBlock} from './PuckProductFeatureAltBlock';
import type {PageUiProductFeatureAltProps} from './types';

function buildFields(props: PageUiProductFeatureAltProps): Fields<PageUiProductFeatureAltProps> {
  const fields: Record<string, unknown> = {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showCta: yesNo('Show CTA'),
    showImage: yesNo('Show image'),
    variant: {
      type: 'select',
      label: 'Variant',
      options: [
        {label: 'Primary', value: 'primary'},
        {label: 'Secondary', value: 'secondary'},
      ],
    },
    withBackground: yesNo('Background'),
    withBackgroundGlow: yesNo('Background glow'),
    sectionId: sectionIdField,
  };

  if (props.showCta) {
    fields.ctaLabel = {type: 'text', label: 'CTA label', contentEditable: true};
    fields.ctaHref = {type: 'text', label: 'CTA URL'};
    fields.showCtaNote = yesNo('Show CTA note');
    if (props.showCtaNote) {
      fields.ctaNote = {type: 'text', label: 'CTA note', contentEditable: true};
    }
  }
  if (props.showImage) {
    fields.imageSrc = {type: 'text', label: 'Image URL'};
  }

  return fields as Fields<PageUiProductFeatureAltProps>;
}

const defaults = createDefaultProductFeatureAlt();

export const pageUiProductFeatureAltPuckComponent: ComponentConfig<PageUiProductFeatureAltProps> = {
  label: 'Product Feature (Centered)',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = ['showCta', 'showCtaNote', 'showImage'].some(
      k => changed[k as keyof PageUiProductFeatureAltProps],
    );
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as PageUiProductFeatureAltProps);
  },
  render: props => <PuckProductFeatureAltBlock {...props} />,
};
