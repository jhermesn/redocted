import { describe, expect, it } from 'vitest';
import { qualityProblems } from '../scripts/corpus/quality.ts';
import type { Article, Block } from '../src/lib/types.ts';

const prose = Array.from({ length: 160 }, (_, i) => `word${i}`).join(' ');

function articleOf(title: string, body: Block[], lemmas: Record<string, string[]> = {}): Article {
  return { id: 't', corpus: 'k8s', title, sourceUrl: 'https://example.com', license: 'test', blocks: [{ kind: 'h1', text: title }, ...body], lemmas };
}

describe('qualityProblems', () => {
  it('given enough prose that mentions every title word, reports nothing', () => {
    expect(qualityProblems(articleOf('Pods', [{ kind: 'p', text: `Pods run containers. ${prose}` }]))).toEqual([]);
  });

  it('given a title word that only appears in another form, accepts it through the lemma table', () => {
    const article = articleOf('Limit Ranges', [{ kind: 'p', text: `A limit range sets limits. ${prose}` }], { ranges: ['range'], limits: ['limit'] });
    expect(qualityProblems(article)).toEqual([]);
  });

  it('given a title word that never appears in the text, reports it', () => {
    expect(qualityProblems(articleOf('Limit Ranges', [{ kind: 'p', text: `A LimitRange sets limit values. ${prose}` }], { ranges: ['range'] }))).toEqual([
      'title word "Ranges" never appears in the text',
    ]);
  });

  it('given too little prose, reports the word count', () => {
    expect(qualityProblems(articleOf('Pods', [{ kind: 'p', text: 'Pods are small.' }]))).toEqual(['only 2 words of prose (minimum 150)']);
  });

  it('given a title made only of always-visible words, reports it', () => {
    expect(qualityProblems(articleOf('The 2026', [{ kind: 'p', text: prose }]))).toEqual(['title has no guessable words']);
  });
});
