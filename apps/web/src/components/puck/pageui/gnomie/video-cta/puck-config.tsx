import type {ComponentConfig} from '@puckeditor/core';

import {yesNo, sectionIdField} from '../../front-centre/shared-fields';
import {createDefaultGnomieVideoCta} from './defaults';
import {PuckGnomieVideoCtaBlock} from './PuckGnomieVideoCtaBlock';
import type {GnomieVideoCtaProps} from './types';

export const gnomieVideoCtaPuckComponent: ComponentConfig<GnomieVideoCtaProps> = {
  label: 'Gnomie Video CTA',
  defaultProps: createDefaultGnomieVideoCta(),
  fields: {
    title: {type: 'text', label: 'Title', contentEditable: true},
    description: {type: 'textarea', label: 'Description', contentEditable: true},
    videoSrc: {type: 'text', label: 'Video URL'},
    autoPlay: yesNo('Autoplay'),
    controls: yesNo('Show controls'),
    withBackground: yesNo('Background'),
    showLogo: yesNo('Show logo'),
    showPrimaryCta: yesNo('Show CTA'),
    primaryCtaLabel: {type: 'text', label: 'CTA label', contentEditable: true},
    primaryCtaHref: {type: 'text', label: 'CTA URL'},
    ctaNote: {type: 'text', label: 'CTA note', contentEditable: true},
    sectionId: sectionIdField,
  },
  render: props => <PuckGnomieVideoCtaBlock {...props} />,
};
