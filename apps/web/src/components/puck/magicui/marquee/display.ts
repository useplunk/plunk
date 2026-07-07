import type {MarqueeDisplayOptions} from './types';

export function normalizeMarqueeDisplayFields(
  options: MarqueeDisplayOptions,
  changed?: Partial<MarqueeDisplayOptions>,
): MarqueeDisplayOptions {
  const {showName, showUsername, showReview} = options;
  const hasTextField = showName || showUsername || showReview;

  if (hasTextField) {
    return options;
  }

  if (changed?.showName === false) {
    return {...options, showName: true};
  }
  if (changed?.showUsername === false) {
    return {...options, showUsername: true};
  }
  if (changed?.showReview === false) {
    return {...options, showReview: true};
  }

  return {...options, showReview: true};
}
