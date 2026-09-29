import { describe, expect, it } from 'vitest';
import {
  articleIdFor,
  currentPuzzle,
  puzzleNumberFor,
  resolvePuzzle,
  validateSeasons,
} from '../src/lib/daily.ts';
import type { CorpusIndex } from '../src/lib/types.ts';

const IDS = ['a', 'b', 'c', 'd', 'e'];
const oneSeason: CorpusIndex = { corpus: 'aws', seasons: [{ startPuzzle: 1, salt: 'test-s1', ids: IDS }] };
const twoSeasons: CorpusIndex = {
  corpus: 'aws',
  seasons: [
    { startPuzzle: 1, salt: 'test-s1', ids: IDS },
    { startPuzzle: 10, salt: 'test-s2', ids: [...IDS, 'f', 'g'] },
  ],
};

describe('puzzleNumberFor', () => {
  it.each([
    ['2026-10-01T00:00:00Z', 1],
    ['2026-10-01T23:59:59Z', 1],
    ['2026-10-02T00:00:00Z', 2],
    ['2026-10-01T22:00:00-03:00', 2],
    ['2026-10-01T20:59:59-03:00', 1],
  ])('given %s, returns puzzle %i (rollover at UTC midnight)', (iso, expected) => {
    expect(puzzleNumberFor(new Date(iso))).toBe(expected);
  });
});

describe('currentPuzzle', () => {
  it('given a date before launch, returns puzzle 1', () => {
    expect(currentPuzzle(new Date('2026-09-23T12:00:00Z'))).toBe(1);
  });
});

describe('resolvePuzzle', () => {
  it.each([
    [null, 50],
    ['abc', 50],
    ['0', 50],
    ['-1', 50],
    ['1.5', 50],
    ['51', 50],
    ['1', 1],
    ['50', 50],
  ])('given param %s and today 50, returns %i', (param, expected) => {
    expect(resolvePuzzle(param, 50)).toBe(expected);
  });
});

describe('articleIdFor', () => {
  it('given a season, plays its ids in the stored order', () => {
    expect([1, 2, 3, 4, 5].map((p) => articleIdFor(oneSeason, p))).toEqual(IDS);
  });

  it('given the puzzle after a full cycle, repeats the cycle', () => {
    expect(articleIdFor(oneSeason, 6)).toBe(articleIdFor(oneSeason, 1));
  });

  it('given a later season, keeps every earlier puzzle unchanged and switches at its start', () => {
    const before = Array.from({ length: 9 }, (_, i) => articleIdFor(oneSeason, i + 1));
    const after = Array.from({ length: 9 }, (_, i) => articleIdFor(twoSeasons, i + 1));
    expect(after).toEqual(before);
    expect(articleIdFor(twoSeasons, 10)).toBe('a');
  });

  it('given a puzzle before the first season, throws', () => {
    const late: CorpusIndex = { corpus: 'aws', seasons: [{ startPuzzle: 5, salt: 's', ids: IDS }] };
    expect(() => articleIdFor(late, 1)).toThrow('no season covers puzzle 1');
  });
});

describe('validateSeasons', () => {
  it('given a valid index, does not throw', () => {
    expect(() => validateSeasons(twoSeasons)).not.toThrow();
  });

  it.each([
    ['no seasons', { corpus: 'aws', seasons: [] }],
    ['first season not at 1', { corpus: 'aws', seasons: [{ startPuzzle: 2, salt: 's', ids: IDS }] }],
    ['empty ids', { corpus: 'aws', seasons: [{ startPuzzle: 1, salt: 's', ids: [] }] }],
    ['duplicate ids', { corpus: 'aws', seasons: [{ startPuzzle: 1, salt: 's', ids: ['a', 'a'] }] }],
    [
      'non-increasing starts',
      {
        corpus: 'aws',
        seasons: [
          { startPuzzle: 1, salt: 's1', ids: IDS },
          { startPuzzle: 1, salt: 's2', ids: IDS },
        ],
      },
    ],
  ])('given %s, throws', (_, index) => {
    expect(() => validateSeasons(index as CorpusIndex)).toThrow();
  });
});
