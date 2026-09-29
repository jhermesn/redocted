import { describe, expect, it } from 'vitest';
import { acceptArticles } from '../scripts/corpus/accept.ts';
import type { Article } from '../src/lib/types.ts';

const prose = Array.from({ length: 160 }, (_, i) => `word${i}`).join(' ');

function article(id: string, title: string, body = `${title} ${prose}`): Article {
  return { id, corpus: 'aws', title, sourceUrl: `https://docs.aws.amazon.com/${id}`, license: 'test', blocks: [{ kind: 'h1', text: title }, { kind: 'p', text: body }], lemmas: {} };
}

describe('acceptArticles', () => {
  it('given fair articles with new titles, accepts them in order', () => {
    const { accepted, skipped } = acceptArticles([article('a', 'Alpha'), article('b', 'Beta')], { knownTitles: new Set(), retiredNames: new Set() });
    expect(accepted.map((item) => item.id)).toEqual(['a', 'b']);
    expect(skipped).toEqual([]);
  });

  it('given a title already used by a known page or an earlier candidate, skips the duplicate', () => {
    const { accepted, skipped } = acceptArticles([article('a', 'Alpha'), article('b', 'alpha'), article('c', 'Gamma')], {
      knownTitles: new Set(['gamma']),
      retiredNames: new Set(),
    });
    expect(accepted.map((item) => item.id)).toEqual(['a']);
    expect(skipped.map((item) => item.id)).toEqual(['b', 'c']);
  });

  it('given a retired service, skips it with the reason', () => {
    const { accepted, skipped } = acceptArticles([article('m', 'AWS App Mesh')], { knownTitles: new Set(), retiredNames: new Set(['awsappmesh']) });
    expect(accepted).toEqual([]);
    expect(skipped).toEqual([{ id: 'm', reasons: ['AWS lists "AWS App Mesh" as retired'] }]);
  });

  it('given an unfair article, skips it with the quality problems', () => {
    const { skipped } = acceptArticles([article('s', 'Short', 'Short text.')], { knownTitles: new Set(), retiredNames: new Set() });
    expect(skipped[0].reasons[0]).toMatch(/words of prose/);
  });
});
