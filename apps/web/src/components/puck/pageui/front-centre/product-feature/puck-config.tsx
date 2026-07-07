import type {ComponentConfig, Fields} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../shared-fields';
import {createDefaultProductFeature} from './defaults';
import {PuckProductFeatureBlock} from './PuckProductFeatureBlock';
import type {PageUiProductFeatureProps} from './types';

function buildFields(props: PageUiProductFeatureProps): Fields<PageUiProductFeatureProps> {
  const fields: Record<string, unknown> = {
    title: {type: 'text', label: 'Title', contentEditable: true},
    showKeyPoints: yesNo('Show key points'),
    showCta: yesNo('Show CTA'),
    showImage: yesNo('Show image'),
    sectionId: sectionIdField,
  };

  if (props.showKeyPoints) {
    fields.keyPoints = {
      type: 'array',
      label: 'Key points',
      getItemSummary: (item: PageUiProductFeatureProps['keyPoints'][number]) => item.title || 'Point',
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
  if (props.showImage) {
    fields.imageSrc = {type: 'text', label: 'Image URL'};
    fields.imageAlt = {type: 'text', label: 'Image alt'};
    fields.imagePosition = {
      type: 'select',
      label: 'Image position',
      options: [
        {label: 'Left', value: 'left'},
        {label: 'Right', value: 'right'},
        {label: 'Center', value: 'center'},
      ],
    };
    fields.imagePerspective = {
      type: 'select',
      label: 'Image perspective',
      options: [
        {label: 'None', value: 'none'},
        {label: 'Left', value: 'left'},
        {label: 'Right', value: 'right'},
        {label: 'Bottom', value: 'bottom'},
        {label: 'Bottom large', value: 'bottom-lg'},
        {label: 'Paper', value: 'paper'},
      ],
    };
  }

  return fields as Fields<PageUiProductFeatureProps>;
}

const defaults = createDefaultProductFeature();

export const pageUiProductFeaturePuckComponent: ComponentConfig<PageUiProductFeatureProps> = {
  label: 'Product Feature',
  defaultProps: defaults,
  fields: buildFields(defaults),
  resolveFields: (data, {changed, lastFields}) => {
    const toggled = ['showKeyPoints', 'showCta', 'showCtaNote', 'showImage'].some(
      k => changed[k as keyof PageUiProductFeatureProps],
    );
    if (!toggled && lastFields) return lastFields;
    return buildFields(data.props as PageUiProductFeatureProps);
  },
  render: props => <PuckProductFeatureBlock {...props} />,
};
