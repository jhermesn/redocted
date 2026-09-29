import { describe, expect, it } from 'vitest';
import { parseCorpus } from '../src/lib/corpora.ts';

describe('parseCorpus', () => {
  it.each([
    ['k8s', 'k8s'],
    ['aws', 'aws'],
    [null, 'aws'],
    ['gcp', 'aws'],
  ])('given %s, returns %s', (input, expected) => {
    expect(parseCorpus(input)).toBe(expected);
  });
});
