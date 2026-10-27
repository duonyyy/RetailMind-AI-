import viMessages from './messages/vi.json';
import enMessages from './messages/en.json';

export type SupportedLocale = 'vi' | 'en';

const DICTIONARIES: Record<SupportedLocale, typeof viMessages> = {
  vi: viMessages,
  en: enMessages,
};

export function getDictionary(locale: SupportedLocale = 'vi') {
  return DICTIONARIES[locale] || DICTIONARIES.vi;
}

