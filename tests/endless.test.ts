import { describe, expect, it } from 'vitest';
import { endlessPool, pickEndless } from '../src/lib/endless.ts';
import type { CorpusIndex } from '../src/lib/types.ts';

const index: CorpusIndex = {
  corpus: 'aws',
  seasons: [
    { startPuzzle: 1, salt: 's1', ids: ['a', 'b', 'c'] },
    { startPuzzle: 10, salt: 's2', ids: ['c', 'd', 'e'] },
    { startPuzzle: 20, salt: 's3', ids: ['f'] },
  ],
};

describe('endlessPool', () => {
  it('given a day inside the first season, returns only its ids', () => {
    expect(endlessPool(index, 9)).toEqual(['a', 'b', 'c']);
  });

  it('given the day a season starts, includes it without duplicates', () => {
    expect(endlessPool(index, 10)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('given a day before a future season, leaves its ids out', () => {
    expect(endlessPool(index, 19)).not.toContain('f');
  });
});

describe('pickEndless', () => {
  const pool = ['a', 'b', 'c'];

  it.each([
    [0, 'b'],
    [0.99, 'c'],
  ])('given random %d and current a, never repeats the current article', (random, expected) => {
    expect(pickEndless(pool, 'a', () => random)).toBe(expected);
  });

  it('given no current article, can pick any of the pool', () => {
    expect(pickEndless(pool, null, () => 0)).toBe('a');
  });

  it('given a single article, returns it even if it is the current one', () => {
    expect(pickEndless(['a'], 'a', () => 0.5)).toBe('a');
  });
});
