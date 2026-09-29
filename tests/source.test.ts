import { describe, expect, it } from 'vitest';
import { parseSourceFile } from '../scripts/corpus/source.ts';

const valid = {
  corpus: 'aws',
  license: 'AWS Documentation',
  seasons: [{ startPuzzle: 1, salt: 'aws-season-1', pages: [{ id: 'lambda', docsUrl: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html' }] }],
};

describe('parseSourceFile', () => {
  it('given a valid manifest, returns it', () => {
    expect(parseSourceFile(valid)).toEqual(valid);
  });

  it.each([
    ['an unknown corpus', { ...valid, corpus: 'gcp' }],
    ['a page without a URL', { ...valid, seasons: [{ ...valid.seasons[0], pages: [{ id: 'lambda' }] }] }],
    ['a relative URL', { ...valid, seasons: [{ ...valid.seasons[0], pages: [{ id: 'lambda', docsUrl: '/lambda' }] }] }],
    ['a fractional start', { ...valid, seasons: [{ ...valid.seasons[0], startPuzzle: 1.5 }] }],
    ['a page on another site', { ...valid, seasons: [{ ...valid.seasons[0], pages: [{ id: 'x', docsUrl: 'https://example.com/x' }] }] }],
    ['a plain-http page', { ...valid, seasons: [{ ...valid.seasons[0], pages: [{ id: 'x', docsUrl: 'http://docs.aws.amazon.com/x' }] }] }],
  ])('given %s, throws', (_, manifest) => {
    expect(() => parseSourceFile(manifest)).toThrow();
  });
});
