import { eng } from 'stopword';

export interface Token {
  text: string;
  isWord: boolean;
}

export type LemmaTable = Readonly<Record<string, readonly string[]>>;

const WORD_PATTERN = "[\\p{L}\\p{N}]+(?:['’][\\p{L}\\p{N}]+)*";
const WORD_SPLIT = new RegExp(`(${WORD_PATTERN})`, 'u');
const WORD = new RegExp(`^${WORD_PATTERN}$`, 'u');
const PURE_NUMBER = /^\p{N}+$/u;

export function foldWord(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').replace(/’/g, "'").toLowerCase();
}

const STOPWORDS: ReadonlySet<string> = new Set(eng);

export function isWord(text: string): boolean {
  return WORD.test(text);
}

export function isAlwaysVisible(word: string): boolean {
  const folded = foldWord(word);
  return folded.length === 1 || PURE_NUMBER.test(folded) || STOPWORDS.has(folded);
}

// Visible from the start: numbers, single letters, stopwords, and any form
// of a stopword ("does" for "do", "its" for "it").
export function isVisible(table: LemmaTable, word: string): boolean {
  return isAlwaysVisible(word) || lemmasOf(table, word).some((lemma) => STOPWORDS.has(lemma));
}

export function lemmasOf(table: LemmaTable, word: string): readonly string[] {
  const folded = foldWord(word);
  // Own keys only: guesses such as "constructor" must not reach Object.prototype.
  return Object.hasOwn(table, folded) ? table[folded] : [folded];
}

export function tokenize(text: string): Token[] {
  return text
    .normalize('NFC')
    .split(WORD_SPLIT)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, isWord: WORD.test(part) }));
}
