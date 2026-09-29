import { describe, expect, it } from 'vitest';
import { buildLemmaTable, lemmasOfWord } from '../scripts/corpus/lemmas.ts';
import { sharesLemma } from '../src/lib/game.ts';
import { lemmasOf } from '../src/lib/normalize.ts';

function shareLemma(table: Record<string, string[]>, a: string, b: string): boolean {
  return sharesLemma(lemmasOf(table, a), lemmasOf(table, b));
}

describe('lemmasOfWord', () => {
  it.each([
    ['boxes', 'box'],
    ['aliases', 'alias'],
    ['cookies', 'cookie'],
    ['policies', 'policy'],
    ['running', 'run'],
    ['ran', 'run'],
    ['namespaces', 'namespace'],
    ["pod's", 'pod'],
  ])('given %s, includes the lemma %s', (word, lemma) => {
    expect(lemmasOfWord(word)).toContain(lemma);
  });

  it('given an unknown technical word, keeps the word itself as a lemma', () => {
    expect(lemmasOfWord('kubectl')).toEqual(['kubectl']);
  });
});

describe('buildLemmaTable', () => {
  it.each([
    ['namespace', 'namespaces'],
    ['box', 'boxes'],
    ['alias', 'aliases'],
    ['cookie', 'cookies'],
    ['run', 'running'],
  ])('given an article with %s, lets the guess %s match it', (articleWord, guess) => {
    expect(shareLemma(buildLemmaTable([articleWord]), articleWord, guess)).toBe(true);
  });

  it.each([
    ['plane', 'plan'],
    ['suite', 'suit'],
  ])('given an article with %s, does not let the unrelated guess %s match it', (articleWord, guess) => {
    expect(shareLemma(buildLemmaTable([articleWord]), articleWord, guess)).toBe(false);
  });

  it('given article words that name Object.prototype members, stores them as plain entries', () => {
    const table = buildLemmaTable(['constructor', 'constructors']);
    expect(Object.getPrototypeOf(table)).toBeNull();
    expect(table.constructors).toContain('constructor');
  });

  it.each([
    ['HTTPS', 'http'],
    ['iOS', 'io'],
    ['DNS', 'dn'],
    ['AWS', 'aw'],
  ])('given the acronym %s, does not invent the singular %s', (articleWord, guess) => {
    expect(shareLemma(buildLemmaTable([articleWord]), articleWord.toLowerCase(), guess)).toBe(false);
  });

  it('given an acronym plural such as APIs, lets the singular match it', () => {
    expect(shareLemma(buildLemmaTable(['APIs']), 'apis', 'api')).toBe(true);
  });

  it('given words that are their own only lemma, leaves them out of the table', () => {
    expect(buildLemmaTable(['kubectl'])).not.toHaveProperty('kubectl');
  });
});
