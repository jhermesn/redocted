import pluralize from 'pluralize';
import lemmatizer from 'wink-lemmatizer';
import lexicon from 'wink-lexicon/src/lexicon.js';
import { foldWord } from '../../src/lib/normalize.ts';

// Build-time only: the browser gets a per-article table from these functions
// instead of the 12 MB lexicon, the same trade-off Redactle makes.

const POSSESSIVE = /'s$/;
const PLAIN_WORD = /^[a-z]+$/;

let inverseIndex: Map<string, Set<string>> | undefined;

export function lemmasOfWord(word: string): string[] {
  const base = word.replace(POSSESSIVE, '');
  return [...new Set([lemmatizer.noun(base), lemmatizer.verb(base), lemmatizer.adjective(base), pluralize.singular(base)])];
}

// Acronyms are not English plurals: "HTTPS" is not "HTTP"+s and "iOS" is not
// "iO"+s. Only a lowercase s after a capitalized stem ("APIs") is a plural.
const ACRONYM = /\p{Lu}.*\p{Lu}/u;
const ACRONYM_PLURAL = /^\p{Lu}[\p{Lu}\p{N}]+s$/u;

// Maps every form a player could type for the article's words (including forms
// the article itself never uses) to its lemmas. Takes words as they appear in
// the text, because capitalization tells acronyms apart. Forms whose only lemma
// is the form itself are left out; the client treats a missing entry that way.
export function buildLemmaTable(articleWords: Iterable<string>): Record<string, string[]> {
  const spellings = new Map<string, string[]>();
  for (const surface of articleWords) {
    const word = foldWord(surface);
    spellings.set(word, [...(spellings.get(word) ?? []), surface]);
  }
  const table: Record<string, string[]> = Object.create(null);
  const record = (form: string, lemmas: string[]) => {
    if (lemmas.length > 1 || lemmas[0] !== form) table[form] = lemmas;
  };
  for (const [word, surfaces] of spellings) {
    if (surfaces.some((surface) => ACRONYM_PLURAL.test(surface))) {
      record(word, [word, word.slice(0, -1)]);
    } else if (!surfaces.some((surface) => ACRONYM.test(surface))) {
      const lemmas = lemmasOfWord(word);
      record(word, lemmas);
      for (const form of relatedForms(lemmas)) {
        if (!spellings.has(form)) record(form, lemmasOfWord(form));
      }
    }
  }
  return table;
}

function relatedForms(lemmas: readonly string[]): Set<string> {
  const index = lexiconInverseIndex();
  const forms = new Set<string>();
  for (const lemma of lemmas) {
    forms.add(pluralize.plural(lemma));
    index.get(lemma)?.forEach((form) => forms.add(form));
  }
  return forms;
}

function lexiconInverseIndex(): Map<string, Set<string>> {
  if (inverseIndex) return inverseIndex;
  inverseIndex = new Map();
  for (const form of Object.keys(lexicon)) {
    if (!PLAIN_WORD.test(form)) continue;
    for (const lemma of lemmasOfWord(form)) {
      const forms = inverseIndex.get(lemma) ?? new Set<string>();
      forms.add(form);
      inverseIndex.set(lemma, forms);
    }
  }
  return inverseIndex;
}
