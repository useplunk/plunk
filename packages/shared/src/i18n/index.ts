import type {Language} from './languages.js';
// Static imports for all translation files
import enTranslations from './locales/en.json' with {type: 'json'};
import nlTranslations from './locales/nl.json' with {type: 'json'};
import frTranslations from './locales/fr.json' with {type: 'json'};
import deTranslations from './locales/de.json' with {type: 'json'};
import hiTranslations from './locales/hi.json' with {type: 'json'};
import ptTranslations from './locales/pt.json' with {type: 'json'};
import bgTranslations from './locales/bg.json' with {type: 'json'};
import csTranslations from './locales/cs.json' with {type: 'json'};
import plTranslations from './locales/pl.json' with {type: 'json'};
import esTranslations from './locales/es.json' with {type: 'json'};
import itTranslations from './locales/it.json' with {type: 'json'};
import zhTWTranslations from './locales/zh-TW.json' with {type: 'json'};
import zhHKTranslations from './locales/zh-HK.json' with {type: 'json'};
import zhCNTranslations from './locales/zh-CN.json' with {type: 'json'};
import jaTranslations from './locales/ja.json' with {type: 'json'};
import svTranslations from './locales/sv.json' with {type: 'json'};

export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  isValidLanguageCode,
  getLanguageByCode,
  type Language,
} from './languages.js';

export type TranslationKey = string;

export interface Translations {
  pages: {
    unsubscribe: Record<string, string>;
    subscribe: Record<string, string>;
    manage: Record<string, string>;
    common: Record<string, string>;
  };
  email: {
    footer: Record<string, string>;
  };
}

// Static mapping of language codes to translations
const translationsMap: Record<string, Translations> = {
  'en': enTranslations,
  'nl': nlTranslations,
  'de': deTranslations,
  'fr': frTranslations,
  'hi': hiTranslations,
  'pt': ptTranslations,
  'bg': bgTranslations,
  'cs': csTranslations,
  'pl': plTranslations,
  'es': esTranslations,
  'it': itTranslations,
  'zh-TW': zhTWTranslations,
  'zh-HK': zhHKTranslations,
  'zh-CN': zhCNTranslations,
  'ja': jaTranslations,
  'sv': svTranslations,
};

// In-memory cache for loaded translations
const translationCache = new Map<string, Translations>();

/**
 * Load translations for a given language code (async)
 * Uses static imports for reliable resolution
 */
export async function loadTranslations(languageCode: string): Promise<Translations> {
  // Check cache first
  if (translationCache.has(languageCode)) {
    return translationCache.get(languageCode)!;
  }

  // Get translations from static map
  const translations = translationsMap[languageCode];

  if (translations) {
    translationCache.set(languageCode, translations);
    return translations;
  }

  // Fallback to English if language not found
  console.warn(`Translation file not found for ${languageCode}, falling back to English`);
  if (languageCode !== 'en') {
    return loadTranslations('en');
  }

  throw new Error(`Failed to load translations for ${languageCode}`);
}

/**
 * Synchronous translation loader (requires pre-built translations)
 * For API server use (compiled at build time)
 */
export function loadTranslationsSync(languageCode: string): Translations {
  if (translationCache.has(languageCode)) {
    return translationCache.get(languageCode)!;
  }

  // Get translations from static map
  const translations = translationsMap[languageCode];

  if (translations) {
    translationCache.set(languageCode, translations);
    return translations;
  }

  // Fallback to English if language not found
  if (languageCode !== 'en') {
    return loadTranslationsSync('en');
  }

  throw new Error(`Failed to load translations for ${languageCode}`);
}

/**
 * Simple template string replacement
 * Example: interpolate("Hello {name}", { name: "World" }) => "Hello World"
 */
export function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
}

/**
 * Get nested translation value by dot notation path
 * Example: getTranslation(translations, "pages.unsubscribe.title")
 */
export function getTranslation(translations: Translations, path: string): string {
  const keys = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = translations;

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      console.warn(`Translation key not found: ${path}`);
      return path; // Return the key itself as fallback
    }
  }

  return typeof value === 'string' ? value : path;
}

/**
 * Translation helper class for easier use
 */
export class Translator {
  private translations: Translations;
  private languageCode: string;

  constructor(translations: Translations, languageCode: string) {
    this.translations = translations;
    this.languageCode = languageCode;
  }

  /**
   * Translate a key with optional interpolation
   * Example: t("pages.unsubscribe.description", { email: "user@example.com" })
   */
  t(key: string, values?: Record<string, string>): string {
    const translation = getTranslation(this.translations, key);
    return values ? interpolate(translation, values) : translation;
  }

  getLanguageCode(): string {
    return this.languageCode;
  }
}

/**
 * Create a translator instance for a given language (async)
 */
export async function createTranslator(languageCode: string): Promise<Translator> {
  const translations = await loadTranslations(languageCode);
  return new Translator(translations, languageCode);
}

/**
 * Create a translator instance for a given language (sync)
 */
export function createTranslatorSync(languageCode: string): Translator {
  const translations = loadTranslationsSync(languageCode);
  return new Translator(translations, languageCode);
}
