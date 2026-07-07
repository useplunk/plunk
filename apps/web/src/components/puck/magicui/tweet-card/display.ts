import type {TweetCardDisplayOptions} from './types';

export function normalizeTweetId(input: string): string {
  const trimmed = input.trim();
  const statusMatch = trimmed.match(/status\/(\d+)/i);
  if (statusMatch?.[1]) {
    return statusMatch[1];
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly || trimmed;
}

export function normalizeTweetCardDisplayFields(
  options: TweetCardDisplayOptions,
  changed?: Partial<TweetCardDisplayOptions>,
): TweetCardDisplayOptions {
  const {showHeader, showBody, showMedia} = options;
  const hasVisibleSection = showHeader || showBody || showMedia;

  if (hasVisibleSection) {
    return options;
  }

  if (changed?.showHeader === false) {
    return {...options, showHeader: true};
  }
  if (changed?.showBody === false) {
    return {...options, showBody: true};
  }
  if (changed?.showMedia === false) {
    return {...options, showMedia: true};
  }

  return {...options, showBody: true};
}
