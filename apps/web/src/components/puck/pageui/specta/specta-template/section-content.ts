import type {Content} from '@puckeditor/core';

import {createDefaultSpectaMarquee} from '../marquee/defaults';
import {createDefaultSpectaProductFeatureCreate, createDefaultSpectaProductFeatureManage} from '../product-feature/defaults';
import {createDefaultSpectaSaleCta} from '../sale-cta/defaults';
import {createDefaultSpectaShowcase} from '../showcase/defaults';
import {createDefaultSpectaShowcaseMarquee} from '../showcase-marquee/defaults';
import {createDefaultSpectaTestimonialInline} from '../testimonial-inline/defaults';
import {createDefaultSpectaTestimonials} from '../testimonials/defaults';
import {createDefaultSpectaVideoCta} from '../video-cta/defaults';

function section<T extends object>(id: string, type: string, props: T): Content[number] {
  return {
    type,
    props: {
      id,
      ...props,
    },
  };
}

export function createSpectaSlotContent(): Content {
  return [
    section('specta-video-cta', 'SpectaVideoCta', createDefaultSpectaVideoCta()),
    section('specta-marquee', 'SpectaMarquee', createDefaultSpectaMarquee()),
    section('specta-testimonial-inline', 'SpectaTestimonialInline', createDefaultSpectaTestimonialInline()),
    section('specta-product-feature-create', 'SpectaProductFeature', createDefaultSpectaProductFeatureCreate()),
    section('specta-showcase', 'SpectaShowcase', createDefaultSpectaShowcase()),
    section('specta-product-feature-manage', 'SpectaProductFeature', createDefaultSpectaProductFeatureManage()),
    section('specta-showcase-marquee', 'SpectaShowcaseMarquee', createDefaultSpectaShowcaseMarquee()),
    section('specta-testimonials', 'SpectaTestimonials', createDefaultSpectaTestimonials()),
    section('specta-sale-cta', 'SpectaSaleCta', createDefaultSpectaSaleCta()),
  ];
}
