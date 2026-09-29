import { describe, expect, it } from 'vitest';
import { bundleChangeProblems, discoveryProblems, seasonChangeProblems, withNewPages } from '../scripts/corpus/seasons.ts';
import type { CorpusIndex } from '../src/lib/types.ts';

const a = { id: 'a', docsUrl: 'https://example.com/a' };
const b = { id: 'b', docsUrl: 'https://example.com/b' };
const c = { id: 'c', docsUrl: 'https://example.com/c' };

const d = { id: 'd', docsUrl: 'https://example.com/d' };
const e = { id: 'e', docsUrl: 'https://example.com/e' };
const ids = (season: { pages: { id: string }[] }) => season.pages.map((page) => page.id);

describe('withNewPages', () => {
  it('given no seasons, starts season 1 at puzzle 1 in a shuffled play order', () => {
    const [season] = withNewPages('aws', [], [a, b, c, d, e], { today: -3, leadDays: 14 });
    expect(season).toMatchObject({ startPuzzle: 1, salt: 'aws-season-1' });
    expect([...ids(season)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids(season)).not.toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('given the same inputs, produces the same order', () => {
    const run = () => withNewPages('aws', [], [a, b, c, d, e], { today: -3, leadDays: 14 });
    expect(run()).toEqual(run());
  });

  it('given a season that has not started, reshuffles it with the new pages', () => {
    const seasons = [{ startPuzzle: 1, salt: 'aws-season-1', pages: [a, b] }];
    const [season] = withNewPages('aws', seasons, [c], { today: -3, leadDays: 14 });
    expect([...ids(season)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('given a live season, plays its unplayed pages first, then the new pages, then the played ones', () => {
    const seasons = [{ startPuzzle: 1, salt: 'aws-season-1', pages: [a, b, c] }];
    const next = withNewPages('aws', seasons, [d], { today: 1, leadDays: 1 });
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ startPuzzle: 2, salt: 'aws-season-2' });
    expect(ids(next[1])).toEqual(['b', 'c', 'd', 'a']);
  });

  it('given a live season in a later cycle, continues from the position the new season starts at', () => {
    const seasons = [{ startPuzzle: 1, salt: 'aws-season-1', pages: [a, b, c] }];
    expect(ids(withNewPages('aws', seasons, [d], { today: 3, leadDays: 2 })[1])).toEqual(['b', 'c', 'd', 'a']);
  });

  it('given no new pages, leaves the seasons untouched', () => {
    const seasons = [{ startPuzzle: 1, salt: 'aws-season-1', pages: [a] }];
    expect(withNewPages('aws', seasons, [], { today: 40, leadDays: 14 })).toBe(seasons);
  });
});

describe('seasonChangeProblems', () => {
  const live: CorpusIndex = { corpus: 'aws', seasons: [{ startPuzzle: 1, salt: 's1', ids: ['a', 'b'] }] };

  it('given a new season starting in the future, reports nothing', () => {
    const after = { ...live, seasons: [...live.seasons, { startPuzzle: 60, salt: 's2', ids: ['a', 'b', 'c'] }] };
    expect(seasonChangeProblems(live, after, 40)).toEqual([]);
  });

  it('given an edited season that has already started, reports it', () => {
    const after = { ...live, seasons: [{ startPuzzle: 1, salt: 's1', ids: ['b', 'a'] }] };
    expect(seasonChangeProblems(live, after, 40)).toEqual(['aws season 1 started at puzzle 1 and must not change']);
  });

  it('given a removed season that has already started, reports it', () => {
    expect(seasonChangeProblems(live, { ...live, seasons: [] }, 40)).toContain('aws season 1 started at puzzle 1 and must not change');
  });

  it('given a new season that starts today or earlier, reports it', () => {
    const after = { ...live, seasons: [...live.seasons, { startPuzzle: 40, salt: 's2', ids: ['a', 'b', 'c'] }] };
    expect(seasonChangeProblems(live, after, 40)).toEqual(['aws season 2 is new or changed but starts at puzzle 40, not after today (40)']);
  });

  it('given seasons that have not started yet, allows any change', () => {
    const upcoming: CorpusIndex = { corpus: 'aws', seasons: [{ startPuzzle: 1, salt: 's1', ids: ['a'] }] };
    const after = { ...upcoming, seasons: [{ startPuzzle: 1, salt: 's1', ids: ['a', 'b'] }] };
    expect(seasonChangeProblems(upcoming, after, -3)).toEqual([]);
  });

  it('given a corpus that did not exist before, validates the new index only, even on launch day', () => {
    expect(seasonChangeProblems(null, live, 1)).toEqual([]);
    expect(seasonChangeProblems(null, { corpus: 'aws', seasons: [] }, 1)).toEqual(['corpus aws has no seasons']);
  });
});

describe('bundleChangeProblems', () => {
  const live: CorpusIndex = { corpus: 'aws', seasons: [{ startPuzzle: 1, salt: 's1', ids: ['k1', 'k2'] }] };

  it('given a changed bundle of a started season, reports it', () => {
    expect(bundleChangeProblems(live, ['k2', 'k9'], 40)).toEqual(['aws article k2 is live and must not change']);
  });

  it('given changes only to bundles that are not live yet, reports nothing', () => {
    expect(bundleChangeProblems(live, ['k9'], 40)).toEqual([]);
    expect(bundleChangeProblems(live, ['k1'], -3)).toEqual([]);
  });

  it('given a corpus that did not exist before, reports nothing', () => {
    expect(bundleChangeProblems(null, ['k1'], 40)).toEqual([]);
  });
});

describe('discoveryProblems', () => {
  const known = Array.from({ length: 20 }, (_, i) => `p${i}`);

  it('given discovery that still finds the known pages, reports nothing', () => {
    expect(discoveryProblems('aws', known, [...known.slice(1), 'new'])).toEqual([]);
  });

  it('given discovery that lost most known pages, reports that the site probably changed', () => {
    expect(discoveryProblems('aws', known, ['p1', 'p2'])).toEqual([
      'aws discovery found only 2 of 20 known pages; the sitemap format probably changed',
    ]);
  });

  it('given too few known pages to compare, reports nothing', () => {
    expect(discoveryProblems('aws', ['p1'], [])).toEqual([]);
  });
});

describe('withNewPages and retired pages', () => {
  it('given a retired page in the live season, leaves it out of the next season', () => {
    const seasons = [{ startPuzzle: 1, salt: 'aws-season-1', pages: [a, b, c] }];
    const next = withNewPages('aws', seasons, [d], { today: 1, leadDays: 1, retiredIds: new Set(['c']) });
    expect(ids(next[1])).toEqual(['b', 'd', 'a']);
  });

  it('given only retired pages and no new ones, still opens a season without them', () => {
    const seasons = [{ startPuzzle: 1, salt: 'aws-season-1', pages: [a, b, c] }];
    const next = withNewPages('aws', seasons, [], { today: 1, leadDays: 1, retiredIds: new Set(['a']) });
    expect(ids(next[1])).toEqual(['b', 'c']);
  });
});
