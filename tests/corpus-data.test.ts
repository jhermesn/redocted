import { readdirSync, readFileSync } from 'node:fs';
import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { bundleKey } from '../scripts/corpus/bundles.ts';
import { qualityProblems } from '../scripts/corpus/quality.ts';
import { CORPORA } from '../src/lib/corpora.ts';
import { ArticleSchema, CorpusIndexSchema } from '../src/lib/schemas.ts';

// Guards the committed corpus itself: generated JSON reaches innerHTML and
// href in the browser, and dependency updates (stopwords, lemmatizer) can
// change how existing articles play.
describe.each(CORPORA)('committed %s corpus', (corpus) => {
  const dir = `public/corpus/${corpus}`;
  const index = v.parse(CorpusIndexSchema, JSON.parse(readFileSync(`${dir}/index.json`, 'utf8')));
  const bundleFiles = readdirSync(dir).filter((file) => file !== 'index.json');
  const indexedIds = new Set(index.seasons.flatMap((season) => season.ids));

  it('has a bundle for every indexed id and no stray files', () => {
    expect(new Set(bundleFiles)).toEqual(new Set([...indexedIds].map((id) => `${id}.json`)));
  });

  it.each(bundleFiles)('%s is a valid, fair article stored under its own key', (file) => {
    const article = v.parse(ArticleSchema, JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')));
    expect(`${bundleKey(article.corpus, article.id)}.json`).toBe(file);
    expect(article.corpus).toBe(corpus);
    expect(qualityProblems(article)).toEqual([]);
  });
});
