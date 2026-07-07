import type {PuckData} from '@plunk/types';

import {createDefaultGnomieTemplate} from '../../../components/puck/pageui/gnomie/gnomie-template/defaults';

export const GNOMIE_TEMPLATE: PuckData = {
  root: {props: {}},
  content: [
    {
      type: 'GnomieTemplate',
      props: {
        id: 'gnomie-root',
        ...createDefaultGnomieTemplate(),
      },
    },
  ],
};
