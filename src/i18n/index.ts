import { en, type Messages } from './en.ts';
import { ptBr } from './pt-br.ts';

export type { Messages };

export type Locale = 'en' | 'pt-br';

export const LOCALES: readonly Locale[] = ['en', 'pt-br'];
export const DEFAULT_LOCALE: Locale = 'en';

export const HTML_LANG: Record<Locale, string> = { en: 'en', 'pt-br': 'pt-BR' };
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', 'pt-br': 'pt_BR' };

const DICTIONARIES: Record<Locale, Messages> = { en, 'pt-br': ptBr };

export function parseLocale(value: string | null | undefined): Locale {
  return LOCALES.find((locale) => locale === value) ?? DEFAULT_LOCALE;
}

export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale];
}
