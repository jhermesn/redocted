import { describe, expect, it } from 'vitest';
import { en, type Messages } from '../src/i18n/en.ts';
import { getMessages, LOCALES, parseLocale } from '../src/i18n/index.ts';

describe('parseLocale', () => {
  it.each([
    ['pt-br', 'pt-br'],
    ['en', 'en'],
    [null, 'en'],
    [undefined, 'en'],
    ['fr', 'en'],
    ['PT-BR', 'en'],
  ])('given %s, returns %s', (input, expected) => {
    expect(parseLocale(input)).toBe(expected);
  });
});

describe('dictionaries', () => {
  const keys = Object.keys(en) as (keyof Messages)[];

  it.each(LOCALES)('given %s, defines every English key with the same kind', (locale) => {
    const messages = getMessages(locale);
    expect(keys.map((key) => typeof messages[key])).toEqual(keys.map((key) => typeof en[key]));
  });

  it('given pt-br, translates interpolated strings', () => {
    expect(getMessages('pt-br').resultSummary(3, 50)).toBe('3 palpites · 50% precisão');
  });

  it.each([
    ['en', 1, 'AWS #4 · 1 guess'],
    ['en', 2, 'AWS #4 · 2 guesses'],
    ['pt-br', 1, 'AWS #4 · 1 palpite'],
    ['pt-br', 0, 'AWS #4 · 0 palpite'],
    ['pt-br', 2, 'AWS #4 · 2 palpites'],
  ] as const)('given %s and %i guesses, agrees in number', (locale, guesses, expected) => {
    expect(getMessages(locale).meta('AWS', 4, guesses)).toBe(expected);
  });

  it('given a single guess, uses the singular in the summary and share line', () => {
    expect(getMessages('en').resultSummary(1, 100)).toBe('1 guess · 100% accuracy');
    expect(getMessages('pt-br').shareStatsLine(1, 100)).toBe('🔎 1 palpite · 🎯 100% precisão');
  });
});
