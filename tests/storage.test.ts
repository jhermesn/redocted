import { describe, expect, it } from 'vitest';
import { EMPTY_STATE } from '../src/lib/game.ts';
import { countsTowardStats, currentStreak, EMPTY_STATS, loadSettings, loadState, loadStats, recordResult, saveSettings, saveState, saveStats, type KeyValueStore } from '../src/lib/storage.ts';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

const played = { guesses: ['s3'], hints: ['bucket'], solved: false, gaveUp: false };

describe('game state persistence', () => {
  const slot = { corpus: 'aws', puzzle: 7, articleId: 'k1' } as const;

  it('given a saved state, loads it back for the same corpus, puzzle and article only', () => {
    const store = memoryStore();
    saveState(store, slot, played);
    expect(loadState(store, slot)).toEqual(played);
    expect(loadState(store, { ...slot, puzzle: 8 })).toEqual(EMPTY_STATE);
    expect(loadState(store, { ...slot, corpus: 'k8s' })).toEqual(EMPTY_STATE);
  });

  it('given the puzzle now shows a different article, starts a fresh game', () => {
    const store = memoryStore();
    saveState(store, slot, played);
    expect(loadState(store, { ...slot, articleId: 'k2' })).toEqual(EMPTY_STATE);
  });

  it('given no storage, returns an empty game and saving does not throw', () => {
    expect(loadState(null, slot)).toEqual(EMPTY_STATE);
    expect(() => saveState(null, slot, played)).not.toThrow();
  });

  it('given storage that throws, returns an empty game and saving does not throw', () => {
    expect(loadState(throwingStore, slot)).toEqual(EMPTY_STATE);
    expect(() => saveState(throwingStore, slot, played)).not.toThrow();
  });

  it('given a game saved before hints existed, loads it with no hints', () => {
    const store = memoryStore();
    store.setItem('redocted:v1:aws:game:7:k1', '{"guesses":["s3"],"solved":false,"gaveUp":false}');
    expect(loadState(store, slot)).toEqual({ guesses: ['s3'], hints: [], solved: false, gaveUp: false });
  });

  it.each(['{"guesses":[],"hints":"s3","solved":false,"gaveUp":false}', '{not json', '{"guesses":"s3","solved":false,"gaveUp":false}', '{"guesses":[1],"solved":false,"gaveUp":false}', 'null'])(
    'given corrupted value %s, returns an empty game',
    (raw) => {
      const store = memoryStore();
      store.setItem('redocted:v1:aws:game:7:k1', raw);
      expect(loadState(store, slot)).toEqual(EMPTY_STATE);
    },
  );
});

describe('stats persistence', () => {
  it('given saved stats, loads them back per corpus', () => {
    const store = memoryStore();
    const stats = { played: 3, won: 2, streak: 2, maxStreak: 2, lastWonPuzzle: 5 };
    saveStats(store, 'k8s', stats);
    expect(loadStats(store, 'k8s')).toEqual(stats);
    expect(loadStats(store, 'aws')).toEqual(EMPTY_STATS);
  });
});

describe('recordResult', () => {
  it('given a first win, starts a streak of 1', () => {
    expect(recordResult(EMPTY_STATS, 10, true)).toEqual({ played: 1, won: 1, streak: 1, maxStreak: 1, lastWonPuzzle: 10 });
  });

  it('given a win on the next puzzle, extends the streak', () => {
    const afterFirst = recordResult(EMPTY_STATS, 10, true);
    expect(recordResult(afterFirst, 11, true).streak).toBe(2);
  });

  it('given a win after a skipped day, restarts the streak and keeps the max', () => {
    const twoInARow = recordResult(recordResult(EMPTY_STATS, 10, true), 11, true);
    const afterGap = recordResult(twoInARow, 13, true);
    expect(afterGap.streak).toBe(1);
    expect(afterGap.maxStreak).toBe(2);
  });

  it('given a loss, resets the streak and counts the game', () => {
    const lost = recordResult(recordResult(EMPTY_STATS, 10, true), 11, false);
    expect(lost).toEqual({ played: 2, won: 1, streak: 0, maxStreak: 1, lastWonPuzzle: 10 });
  });
});

describe('currentStreak', () => {
  const stats = { played: 5, won: 5, streak: 5, maxStreak: 5, lastWonPuzzle: 20 };

  it.each([
    [20, 5],
    [21, 5],
    [22, 0],
  ])('given the last win at puzzle 20 and today %i, shows a streak of %i', (today, expected) => {
    expect(currentStreak(stats, today)).toBe(expected);
  });

  it('given no wins, shows 0', () => {
    expect(currentStreak(EMPTY_STATS, 3)).toBe(0);
  });
});

describe('settings persistence', () => {
  it('given nothing saved, hides letter counts', () => {
    expect(loadSettings(memoryStore())).toEqual({ showLetterCounts: false });
  });

  it('given saved settings, loads them back', () => {
    const store = memoryStore();
    saveSettings(store, { showLetterCounts: true });
    expect(loadSettings(store)).toEqual({ showLetterCounts: true });
  });

  it('given corrupted settings or broken storage, falls back to the defaults', () => {
    const store = memoryStore();
    store.setItem('redocted:v1:settings', '{"showLetterCounts":"yes"}');
    expect(loadSettings(store)).toEqual({ showLetterCounts: false });
    expect(loadSettings(throwingStore)).toEqual({ showLetterCounts: false });
  });
});

describe('countsTowardStats', () => {
  const playing = { guesses: ['a'], hints: [], solved: false, gaveUp: false };
  const solved = { ...playing, solved: true };

  it("given today's puzzle that just ended, counts it", () => {
    expect(countsTowardStats(playing, solved, { puzzle: 5, today: 5 })).toBe(true);
  });

  it('given an archive puzzle that just ended, does not count it', () => {
    expect(countsTowardStats(playing, solved, { puzzle: 4, today: 5 })).toBe(false);
  });

  it('given a game that had already ended, does not count it twice', () => {
    expect(countsTowardStats(solved, solved, { puzzle: 5, today: 5 })).toBe(false);
  });

  it('given a game still in progress, does not count it', () => {
    expect(countsTowardStats(playing, { ...playing, guesses: ['a', 'b'] }, { puzzle: 5, today: 5 })).toBe(false);
  });
});
