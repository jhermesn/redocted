import { describe, expect, it } from 'vitest';
import { accuracy, applyGuess, buildPuzzle, EMPTY_STATE, giveUp, hitsFor, isRevealed, type GameState } from '../src/lib/game.ts';
import type { Article } from '../src/lib/types.ts';

const article: Article = {
  id: 's3',
  corpus: 'aws',
  title: 'Amazon S3',
  sourceUrl: 'https://example.com',
  license: 'test',
  blocks: [
    { kind: 'h1', text: 'Amazon S3' },
    { kind: 'p', text: 'Amazon S3 stores objects. Every object lives in buckets and the bucket applies policies to the plane. It does its job.' },
  ],
  lemmas: {
    objects: ['object'],
    buckets: ['bucket'],
    policies: ['policy'],
    policy: ['policy'],
    stores: ['store'],
    applies: ['apply'],
    lives: ['life', 'live'],
    does: ['do', 'does'],
    its: ['it', 'its'],
  },
};
const puzzle = buildPuzzle(article);

function play(...words: string[]): GameState {
  return words.reduce((state, word) => applyGuess(state, puzzle, word).state, EMPTY_STATE);
}

describe('hitsFor', () => {
  it('given a lemma shared by several forms, counts every form', () => {
    expect(hitsFor(puzzle, 'bucket')).toBe(2);
    expect(hitsFor(puzzle, 'objects')).toBe(2);
  });

  it('given a word that only resembles an article word, counts nothing', () => {
    expect(hitsFor(puzzle, 'plan')).toBe(0);
  });

  it('given a stopword, counts nothing because it is always visible', () => {
    expect(hitsFor(puzzle, 'the')).toBe(0);
  });
});

describe('applyGuess', () => {
  it('given a capitalized plural, stores it folded and returns its hits', () => {
    const { state, result } = applyGuess(EMPTY_STATE, puzzle, 'Policies');
    expect(result).toEqual({ kind: 'ok', word: 'policies', hits: 1 });
    expect(state.guesses).toEqual(['policies']);
  });

  it('given an alphanumeric service name, reveals it', () => {
    expect(applyGuess(EMPTY_STATE, puzzle, 's3').result).toEqual({ kind: 'ok', word: 's3', hits: 2 });
  });

  it('given a word not in the article, records a miss', () => {
    expect(applyGuess(EMPTY_STATE, puzzle, 'kubernetes').result).toEqual({ kind: 'ok', word: 'kubernetes', hits: 0 });
  });

  it('given surrounding whitespace, trims it', () => {
    expect(applyGuess(EMPTY_STATE, puzzle, '  Amazon  ').result).toEqual({ kind: 'ok', word: 'amazon', hits: 2 });
  });

  it('given a word sharing a lemma with an earlier guess, returns repeat with the earlier word', () => {
    const { state, result } = applyGuess(play('buckets'), puzzle, 'bucket');
    expect(result).toEqual({ kind: 'repeat', word: 'buckets' });
    expect(state.guesses).toEqual(['buckets']);
  });

  it('given a stopword, returns visible without adding it', () => {
    const { state, result } = applyGuess(EMPTY_STATE, puzzle, 'the');
    expect(result).toEqual({ kind: 'visible' });
    expect(state).toBe(EMPTY_STATE);
  });

  it('given a word that names an Object.prototype member, treats it as an ordinary miss', () => {
    expect(applyGuess(EMPTY_STATE, puzzle, 'constructor').result).toEqual({ kind: 'ok', word: 'constructor', hits: 0 });
  });

  it('given a contraction, accepts it as one word', () => {
    expect(applyGuess(EMPTY_STATE, puzzle, "pod's").result).toEqual({ kind: 'ok', word: "pod's", hits: 0 });
  });

  it.each(['', '   ', 'amazon s3', '<img>', 'a'.repeat(41), '🚀', 'S3!', "'quoted'"])('given invalid input %j, returns invalid', (raw) => {
    const { state, result } = applyGuess(EMPTY_STATE, puzzle, raw);
    expect(result).toEqual({ kind: 'invalid' });
    expect(state).toBe(EMPTY_STATE);
  });

  it('given every title word guessed, marks the game solved', () => {
    expect(play('amazon', 's3').solved).toBe(true);
  });

  it('given a solved game, rejects further guesses', () => {
    expect(applyGuess(play('amazon', 's3'), puzzle, 'bucket').result).toEqual({ kind: 'invalid' });
  });
});

describe('isRevealed', () => {
  it('given a fresh game, hides content words and shows stopwords', () => {
    expect(isRevealed(EMPTY_STATE, puzzle, 'Amazon')).toBe(false);
    expect(isRevealed(EMPTY_STATE, puzzle, 'The')).toBe(true);
  });

  it('given an inflected form of a stopword, shows it from the start', () => {
    expect(isRevealed(EMPTY_STATE, puzzle, 'does')).toBe(true);
    expect(isRevealed(EMPTY_STATE, puzzle, 'its')).toBe(true);
    expect(applyGuess(EMPTY_STATE, puzzle, 'does').result).toEqual({ kind: 'visible' });
  });

  it('given a guessed lemma, reveals every form that shares it', () => {
    expect(isRevealed(play('bucket'), puzzle, 'buckets')).toBe(true);
  });

  it('given a guess of a different word, keeps a look-alike hidden', () => {
    expect(isRevealed(play('plan'), puzzle, 'plane')).toBe(false);
  });

  it('given a game given up, reveals everything', () => {
    expect(isRevealed(giveUp(EMPTY_STATE), puzzle, 'Amazon')).toBe(true);
  });
});

describe('accuracy', () => {
  it('given no guesses, returns 0', () => {
    expect(accuracy(EMPTY_STATE, puzzle)).toBe(0);
  });

  it('given one hit and one miss, returns 0.5', () => {
    expect(accuracy(play('bucket', 'kubernetes'), puzzle)).toBe(0.5);
  });
});
