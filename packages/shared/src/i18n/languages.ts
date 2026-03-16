export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  {code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸'},
  {code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱'},
  {code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷'},
  {code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳'},
  {code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪'},
  {code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷'},
  {code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬'},
  {code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿'},
  {code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱'},
  {code: 'es', name: 'Spanish (Spain)', nativeName: 'Español (España)', flag: '🇪🇸'},
  {code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼'},
];

export const DEFAULT_LANGUAGE = 'en';

export function isValidLanguageCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}
