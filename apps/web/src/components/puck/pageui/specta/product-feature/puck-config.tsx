import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultSpectaProductFeatureCreate} from './defaults';
import {PuckSpectaProductFeatureBlock} from './PuckSpectaProductFeatureBlock';
import type {SpectaProductFeatureProps} from './types';

function buildFields(props: SpectaProductFeatureProps): Fields<SpectaProductFeatureProps> {
  const fields: Record<string, unknown> = {
    eyebrow: {type: 'text', label: 'Eyebrow', contentEditable: true},
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    showKeyPoints: yesNo('Show key points'),
    showCta: yesNo('Show CTA'),
    imageSrc: {type: 'text', label: 'Image URL'},
    imageAlt: {type: 'text', label: 'Image alt'},
    imagePosition: {
      type: 'select',
      label: 'Image position',
      options: [
        {label: 'Left', value: 'left'},
        {label: 'Right', value: 'right'},
      ],
    },
    sectionId: sectionIdField,
  };

  if (props.showKeyPoints) {
    fields.keyPoints = {
      type: 'array',
      label: 'Key points',
      getItemSummary: (item: SpectaProductFeatureProps['keyPoints'][number]) => item.title || 'Point',
      defaultItemProps: {title: 'New point', description: 'Description'},
      arrayFields: {
        title: {type: 'text', label: 'Title'},
        description: {type: 'textarea', label: 'Description'},
      },
    };
  }

  if (props.showCta) {
    fields.ctaLabel = {type: 'text', label: 'CTA label', contentEditable: true};
    fields.ctaHref = {type: 'text', label: 'CTA URL'};
    fields.showCtaNote = yesNo('Show CTA note');
    if (props.showCtaNote) {
      fields.ctaNote = {type: 'text', label: 'CTA note', contentEditable: true};
    }
  }

  return fields as Fields<SpectaProductFeatureProps>;
}

const defaults = createDefaultSpectaProductFeatureCreate();

export const spectaProductFeaturePuckComponent: ComponentConfig<SpectaProductFeatureProps> = {
  label: 'Specta Product Feature',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = ['showKeyPoints', 'showCta', 'showCtaNote'].some(
      k => changed[k as keyof SpectaProductFeatureProps],
    );
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as SpectaProductFeatureProps);
  },
  render: props => <PuckSpectaProductFeatureBlock {...props} />,
};
