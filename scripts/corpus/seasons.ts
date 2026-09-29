import { createHash } from 'node:crypto';
import { createShuffle } from 'fast-shuffle';
import { validateSeasons } from '../../src/lib/daily.ts';
import type { CorpusId, CorpusIndex, Season } from '../../src/lib/types.ts';
import type { SourcePage, SourceSeason } from './source.ts';

export interface SeasonTiming {
  today: number;
  leadDays: number;
  // Pages whose service AWS has retired: kept in seasons already played,
  // left out of every season built from now on.
  retiredIds?: ReadonlySet<string>;
}

// Seasons store their play order, so the browser only indexes it. New pages
// join the upcoming season while it has not started (reshuffled); once it is
// live they open a new season that first plays what the current cycle has not
// reached yet, then the new pages, then what was played most recently.
export function withNewPages(corpus: CorpusId, seasons: readonly SourceSeason[], newPages: readonly SourcePage[], timing: SeasonTiming): readonly SourceSeason[] {
  const retired = timing.retiredIds ?? new Set<string>();
  const last = seasons.at(-1);
  const keep = (pages: readonly SourcePage[]) => pages.filter((page) => !retired.has(page.id));
  const hasRetired = last?.pages.some((page) => retired.has(page.id)) ?? false;
  if (newPages.length === 0 && !hasRetired) return seasons;
  if (!last) {
    const salt = `${corpus}-season-1`;
    return [{ startPuzzle: 1, salt, pages: shuffled(newPages, salt) }];
  }
  if (last.startPuzzle > timing.today) {
    return [...seasons.slice(0, -1), { ...last, pages: shuffled([...keep(last.pages), ...newPages], last.salt) }];
  }
  const startPuzzle = timing.today + timing.leadDays;
  const salt = `${corpus}-season-${seasons.length + 1}`;
  const position = (startPuzzle - last.startPuzzle) % last.pages.length;
  const pages = [...keep(last.pages.slice(position)), ...shuffled(newPages, salt), ...keep(last.pages.slice(0, position))];
  return [...seasons, { startPuzzle, salt, pages }];
}

function shuffled<T>(items: readonly T[], salt: string): T[] {
  const seed = createHash('sha256').update(salt).digest().readUInt32BE(0);
  return createShuffle(seed)([...items]);
}

// Guards the promise that a puzzle, once played, never changes: seasons that
// have started are frozen, and anything new or edited must start later.
export function seasonChangeProblems(before: CorpusIndex | null, after: CorpusIndex, today: number): string[] {
  const problems: string[] = [];
  try {
    validateSeasons(after);
  } catch (error) {
    problems.push((error as Error).message);
  }
  // A corpus that did not exist yet has no played puzzles to protect.
  if (!before) return problems;
  const previous = before.seasons;
  previous.forEach((season, i) => {
    if (season.startPuzzle <= today && !sameSeason(season, after.seasons[i])) {
      problems.push(`${after.corpus} season ${i + 1} started at puzzle ${season.startPuzzle} and must not change`);
    }
  });
  after.seasons.forEach((season, i) => {
    const earlier = previous[i];
    if (earlier?.startPuzzle !== undefined && earlier.startPuzzle <= today) return;
    if (!sameSeason(earlier, season) && season.startPuzzle <= today) {
      problems.push(`${after.corpus} season ${i + 1} is new or changed but starts at puzzle ${season.startPuzzle}, not after today (${today})`);
    }
  });
  return problems;
}

function sameSeason(left: Season | undefined, right: Season | undefined): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

// The index alone cannot show a rewritten article, so changed bundle files are
// checked against the ids of seasons that have started.
export function bundleChangeProblems(before: CorpusIndex | null, changedKeys: readonly string[], today: number): string[] {
  if (!before) return [];
  const live = new Set(before.seasons.filter((season) => season.startPuzzle <= today).flatMap((season) => season.ids));
  return changedKeys.filter((key) => live.has(key)).map((key) => `${before.corpus} article ${key} is live and must not change`);
}

const MIN_KNOWN_FOR_CHECK = 10;
const MIN_FOUND_RATIO = 0.9;

// Discovery that suddenly misses most known pages means the sitemap changed
// shape; failing beats a quiet run that finds nothing new.
export function discoveryProblems(corpus: CorpusId, knownIds: readonly string[], discoveredIds: readonly string[]): string[] {
  if (knownIds.length < MIN_KNOWN_FOR_CHECK) return [];
  const discovered = new Set(discoveredIds);
  const found = knownIds.filter((id) => discovered.has(id)).length;
  if (found / knownIds.length >= MIN_FOUND_RATIO) return [];
  return [`${corpus} discovery found only ${found} of ${knownIds.length} known pages; the sitemap format probably changed`];
}
