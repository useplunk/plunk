import type {Content} from '@puckeditor/core';

import {createDefaultGnomieExampleCarouselMadeWith, createDefaultGnomieExampleCarouselTransform} from '../example-carousel/defaults';
import {createDefaultGnomieFaq} from '../faq/defaults';
import {createDefaultGnomieFeaturesGrid} from '../features-grid/defaults';
import {createDefaultGnomiePricing} from '../pricing/defaults';
import {createDefaultGnomieProductTourDesigns, createDefaultGnomieProductTourSavings} from '../product-tour/defaults';
import {createDefaultGnomieSaleCta} from '../sale-cta/defaults';
import {createDefaultGnomieTestimonials} from '../testimonials/defaults';
import {createDefaultGnomieVideoCta} from '../video-cta/defaults';

function section<T extends object>(id: string, type: string, props: T): Content[number] {
  return {
    type,
    props: {
      id,
      ...props,
    },
  };
}

export function createGnomieSlotContent(): Content {
  return [
    section('gnomie-video-cta', 'GnomieVideoCta', createDefaultGnomieVideoCta()),
    section('gnomie-example-carousel-made-with', 'GnomieExampleCarousel', createDefaultGnomieExampleCarouselMadeWith()),
    section('gnomie-product-tour-designs', 'GnomieProductTour', createDefaultGnomieProductTourDesigns()),
    section('gnomie-product-tour-savings', 'GnomieProductTour', createDefaultGnomieProductTourSavings()),
    section('gnomie-features-grid', 'GnomieFeaturesGrid', createDefaultGnomieFeaturesGrid()),
    section('gnomie-example-carousel-transform', 'GnomieExampleCarousel', createDefaultGnomieExampleCarouselTransform()),
    section('gnomie-testimonials', 'GnomieTestimonials', createDefaultGnomieTestimonials()),
    section('gnomie-pricing', 'GnomiePricing', createDefaultGnomiePricing()),
    section('gnomie-sale-cta', 'GnomieSaleCta', createDefaultGnomieSaleCta()),
    section('gnomie-faq', 'GnomieFaq', createDefaultGnomieFaq()),
  ];
}
