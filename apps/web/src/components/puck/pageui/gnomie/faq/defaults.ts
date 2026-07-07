import {cloneGnomieFaqItems} from '../shared-defaults';
import type {GnomieFaqProps} from './types';

export function createDefaultGnomieFaq(): GnomieFaqProps {
  return {
    title: 'FAQ',
    description: 'Get answers to your questions about transforming your garden with Gnomie.',
    withBackground: true,
    faqItems: cloneGnomieFaqItems(),
    sectionId: '',
  };
}
