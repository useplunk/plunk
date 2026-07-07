import type {AnimatedListDisplayOptions} from './types';

export function normalizeAnimatedListDisplayFields(
  options: AnimatedListDisplayOptions,
  changed?: Partial<AnimatedListDisplayOptions>,
): AnimatedListDisplayOptions {
  const {showName, showDescription, showTime} = options;
  const hasTextField = showName || showDescription || showTime;

  if (hasTextField) {
    return options;
  }

  if (changed?.showName === false) {
    return {...options, showName: true};
  }
  if (changed?.showDescription === false) {
    return {...options, showDescription: true};
  }
  if (changed?.showTime === false) {
    return {...options, showTime: true};
  }

  return {...options, showName: true};
}
