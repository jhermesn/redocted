import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { ArticleSchema, CorpusIndexSchema } from '../src/lib/schemas.ts';

const article = {
  id: 'lambda',
  corpus: 'aws',
  title: 'AWS Lambda',
  sourceUrl: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html',
  license: 'AWS Documentation © Amazon Web Services, Inc.',
  blocks: [{ kind: 'h1', text: 'AWS Lambda' }],
  lemmas: { functions: ['function'] },
};

describe('ArticleSchema', () => {
  it('given a well-formed article, accepts it', () => {
    expect(v.is(ArticleSchema, article)).toBe(true);
  });

  it.each([
    ['a javascript: source URL', { ...article, sourceUrl: 'javascript:alert(1)' }],
    ['a source on another site', { ...article, sourceUrl: 'https://example.com/lambda' }],
    ['a source from the other board', { ...article, sourceUrl: 'https://kubernetes.io/docs/concepts/' }],
    ['a plain-http license link', { ...article, licenseUrl: 'http://creativecommons.org/licenses/by/4.0/' }],
    ['an unknown block kind', { ...article, blocks: [{ kind: 'script', text: 'x' }] }],
    ['lemmas that are not string lists', { ...article, lemmas: { functions: 'function' } }],
  ])('given %s, rejects it', (_, candidate) => {
    expect(v.is(ArticleSchema, candidate)).toBe(false);
  });
});

describe('CorpusIndexSchema', () => {
  it('given a season with a fractional start, rejects it', () => {
    expect(v.is(CorpusIndexSchema, { corpus: 'aws', seasons: [{ startPuzzle: 1.5, salt: 's', ids: ['a'] }] })).toBe(false);
  });
});
