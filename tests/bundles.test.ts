import { describe, expect, it } from 'vitest';
import { bundleKey, pagesToBuild } from '../scripts/corpus/bundles.ts';

const pages = [
  { id: 'lambda', docsUrl: 'https://example.com/lambda' },
  { id: 's3', docsUrl: 'https://example.com/s3' },
];

describe('bundleKey', () => {
  it('given the same corpus and page, returns the same opaque key', () => {
    expect(bundleKey('aws', 'lambda')).toBe(bundleKey('aws', 'lambda'));
  });

  it('given another corpus, returns a different key', () => {
    expect(bundleKey('aws', 'lambda')).not.toBe(bundleKey('k8s', 'lambda'));
  });
});

describe('pagesToBuild', () => {
  const allExisting = new Set(pages.map((page) => `${bundleKey('aws', page.id)}.json`));

  it('given a page whose bundle already exists, skips it so published articles never change', () => {
    const existingFiles = new Set([`${bundleKey('aws', 'lambda')}.json`]);
    expect(pagesToBuild('aws', pages, { existingFiles, refresh: false, frozenIds: new Set() })).toEqual([pages[1]]);
  });

  it('given no bundles yet, builds every page', () => {
    expect(pagesToBuild('aws', pages, { existingFiles: new Set(), refresh: false, frozenIds: new Set() })).toEqual(pages);
  });

  it('given an explicit refresh, rebuilds pages that are not in a started season', () => {
    expect(pagesToBuild('aws', pages, { existingFiles: allExisting, refresh: true, frozenIds: new Set(['lambda']) })).toEqual([pages[1]]);
  });
});
