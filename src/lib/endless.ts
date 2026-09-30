import type { CorpusIndex } from './types.ts';

export const ENDLESS_MODE = 'endless';

// Only seasons that have started: the articles of future seasons are unreleased.
export function endlessPool(index: CorpusIndex, today: number): string[] {
  const started = index.seasons.filter((season) => season.startPuzzle <= today);
  return [...new Set(started.flatMap((season) => season.ids))];
}

export function pickEndless(pool: readonly string[], current: string | null, random: () => number): string {
  const candidates = pool.length > 1 ? pool.filter((id) => id !== current) : pool;
  return candidates[Math.floor(random() * candidates.length)];
}
