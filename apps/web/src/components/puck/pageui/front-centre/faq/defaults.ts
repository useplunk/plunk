import {cloneFaqItems} from '../shared-defaults';
import type {PageUiFaqProps} from './types';

export function createDefaultFaq(): PageUiFaqProps {
  return {
    title: 'FAQ',
    description: 'Find answers to common inquiries about our front-end learning center.',
    faqItems: cloneFaqItems(),
    withBackground: true,
    sectionId: '',
  };
}
