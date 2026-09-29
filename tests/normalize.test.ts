import { describe, expect, it } from 'vitest';
import { foldWord, isAlwaysVisible, lemmasOf, tokenize } from '../src/lib/normalize.ts';

describe('foldWord', () => {
  it.each([
    ['Café', 'cafe'],
    ['LAMBDA', 'lambda'],
    ['EC2', 'ec2'],
    ['Pod’s', "pod's"],
  ])('given %s, returns %s', (input, expected) => {
    expect(foldWord(input)).toBe(expected);
  });
});

describe('isAlwaysVisible', () => {
  it.each([
    ['the', true],
    ['The', true],
    ['of', true],
    ['2026', true],
    ['e', true],
    ['X', true],
    ["don't", false],
    ['S3', false],
    ['EC2', false],
    ['Lambda', false],
  ])('given %s, returns %s', (input, expected) => {
    expect(isAlwaysVisible(input)).toBe(expected);
  });
});

describe('lemmasOf', () => {
  const table = { policies: ['policy'], "pod's": ['pod', "pod's"] };

  it('given a form in the table, returns its lemmas', () => {
    expect(lemmasOf(table, 'Policies')).toEqual(['policy']);
  });

  it('given a form with a curly apostrophe, looks it up folded', () => {
    expect(lemmasOf(table, 'Pod’s')).toEqual(['pod', "pod's"]);
  });

  it('given a word that names an Object.prototype member, returns the word itself', () => {
    expect(lemmasOf(table, 'constructor')).toEqual(['constructor']);
  });

  it('given a form missing from the table, returns the folded form as its only lemma', () => {
    expect(lemmasOf(table, 'Kubectl')).toEqual(['kubectl']);
  });
});

describe('tokenize', () => {
  it('given mixed text, keeps alphanumeric runs as single words and everything else as separators', () => {
    expect(tokenize('Amazon S3, EC2-ready.')).toEqual([
      { text: 'Amazon', isWord: true },
      { text: ' ', isWord: false },
      { text: 'S3', isWord: true },
      { text: ', ', isWord: false },
      { text: 'EC2', isWord: true },
      { text: '-', isWord: false },
      { text: 'ready', isWord: true },
      { text: '.', isWord: false },
    ]);
  });

  it('given apostrophes inside words, keeps contractions and possessives whole', () => {
    expect(tokenize("Pod’s spec doesn't")).toEqual([
      { text: 'Pod’s', isWord: true },
      { text: ' ', isWord: false },
      { text: 'spec', isWord: true },
      { text: ' ', isWord: false },
      { text: "doesn't", isWord: true },
    ]);
  });

  it('given quotes around a word, leaves them as separators', () => {
    expect(tokenize("'pods'")).toEqual([
      { text: "'", isWord: false },
      { text: 'pods', isWord: true },
      { text: "'", isWord: false },
    ]);
  });

  it('given decomposed accents (NFD), returns one composed word', () => {
    expect(tokenize('café')).toEqual([{ text: 'café', isWord: true }]);
  });

  it('given empty text, returns no tokens', () => {
    expect(tokenize('')).toEqual([]);
  });
});
