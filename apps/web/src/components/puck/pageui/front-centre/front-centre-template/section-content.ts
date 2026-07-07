import type {Content} from '@puckeditor/core';

import {createDefaultBand} from '../band/defaults';
import {createDefaultFaq} from '../faq/defaults';
import {createDefaultFeaturesGrid} from '../features-grid/defaults';
import {createDefaultProductFeature} from '../product-feature/defaults';
import {createDefaultProductFeatureAlt} from '../product-feature-alt/defaults';
import {createDefaultSaleCta} from '../sale-cta/defaults';
import {createDefaultSocialBand} from '../social-band/defaults';
import {createDefaultSocialProofBand} from '../social-proof-band/defaults';
import {createDefaultTestimonials} from '../testimonials/defaults';
import {createDefaultVideoCta} from '../video-cta/defaults';

function section<T extends object>(id: string, type: string, props: T): Content[number] {
  return {
    type,
    props: {
      id,
      ...props,
    },
  };
}

export function createFrontCentreSlotContent(): Content {
  return [
    section('fc-social-proof-band', 'PageUiSocialProofBand', createDefaultSocialProofBand()),
    section('fc-video-cta', 'PageUiVideoCta', createDefaultVideoCta()),
    section('fc-band', 'PageUiBand', createDefaultBand()),
    section('fc-product-feature', 'PageUiProductFeature', createDefaultProductFeature()),
    section('fc-product-feature-alt', 'PageUiProductFeatureAlt', createDefaultProductFeatureAlt()),
    section('fc-features-grid', 'PageUiFeaturesGrid', createDefaultFeaturesGrid()),
    section('fc-social-band', 'PageUiSocialBand', createDefaultSocialBand()),
    section('fc-testimonials', 'PageUiTestimonials', createDefaultTestimonials()),
    section('fc-sale-cta', 'PageUiSaleCta', createDefaultSaleCta()),
    section('fc-faq', 'PageUiFaq', createDefaultFaq()),
  ];
}
