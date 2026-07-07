import type {PuckData} from '@plunk/types';

import {createDefaultFrontCentreTemplate} from '../../../components/puck/pageui/front-centre/front-centre-template/defaults';

export const FRONT_CENTRE_TEMPLATE: PuckData = {
  root: {props: {}},
  content: [
    {
      type: 'FrontCentre',
      props: {
        id: 'front-centre-root',
        ...createDefaultFrontCentreTemplate(),
      },
    },
  ],
};

export const LANDING_PAGE_TEMPLATES = [
  {
    id: 'blank',
    label: 'Blank page',
    description: 'Start with an empty canvas and build from scratch.',
    data: undefined,
  },
  {
    id: 'front-centre',
    label: 'Front Centre',
    description: 'Full marketing landing with hero, features, testimonials, FAQ, and CTA.',
    data: FRONT_CENTRE_TEMPLATE,
  },
] as const;

export type LandingPageTemplateId = (typeof LANDING_PAGE_TEMPLATES)[number]['id'];
