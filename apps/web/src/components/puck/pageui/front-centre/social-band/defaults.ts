import {cloneAvatars} from '../shared-defaults';
import type {PageUiSocialBandProps} from './types';

export function createDefaultSocialBand(): PageUiSocialBandProps {
  return {
    title: '12000+ developers',
    description: 'More than 12k developers are already in',
    numberOfUsers: 12000,
    showRating: true,
    showAvatars: true,
    avatars: cloneAvatars(),
    sectionId: '',
  };
}
