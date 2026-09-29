import type { CorpusIndex } from './types.ts';

const DAY_MS = 86_400_000;
const PUZZLE_PARAM = /^\d{1,6}$/;

export const EPOCH_UTC_MS = Date.UTC(2026, 9, 1);

export function puzzleNumberFor(date: Date): number {
  return Math.floor((date.getTime() - EPOCH_UTC_MS) / DAY_MS) + 1;
}

export function currentPuzzle(now: Date): number {
  return Math.max(1, puzzleNumberFor(now));
}

export function resolvePuzzle(param: string | null, today: number): number {
  if (param === null || !PUZZLE_PARAM.test(param)) return today;
  const puzzle = Number(param);
  return puzzle >= 1 && puzzle <= today ? puzzle : today;
}

export function articleIdFor(index: CorpusIndex, puzzle: number): string {
  const season = index.seasons.findLast((candidate) => candidate.startPuzzle <= puzzle);
  if (!season) throw new Error(`no season covers puzzle ${puzzle} in corpus ${index.corpus}`);
  return season.ids[(puzzle - season.startPuzzle) % season.ids.length];
}

export function validateSeasons(index: CorpusIndex): void {
  const { corpus, seasons } = index;
  if (seasons.length === 0) throw new Error(`corpus ${corpus} has no seasons`);
  if (seasons[0].startPuzzle !== 1) throw new Error(`corpus ${corpus}: first season must start at puzzle 1`);
  seasons.forEach((season, i) => {
    if (season.ids.length === 0) throw new Error(`corpus ${corpus}: season ${i} has no ids`);
    if (new Set(season.ids).size !== season.ids.length) throw new Error(`corpus ${corpus}: season ${i} has duplicate ids`);
    if (i > 0 && season.startPuzzle <= seasons[i - 1].startPuzzle) {
      throw new Error(`corpus ${corpus}: season ${i} must start after season ${i - 1}`);
    }
  });
}
