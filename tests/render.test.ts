import { describe, expect, it } from 'vitest';
import { buildPuzzle, EMPTY_STATE, giveUp } from '../src/lib/game.ts';
import { renderArticle } from '../src/lib/render.ts';
import type { Block } from '../src/lib/types.ts';

function puzzleOf(...blocks: Block[]) {
  return buildPuzzle({ id: 't', corpus: 'aws', title: 'T', sourceUrl: 'https://example.com', license: 'test', blocks, lemmas: { buckets: ['bucket'] } });
}

const labels = { redacted: (letters: number) => `redacted, ${letters} letters` };

describe('renderArticle', () => {
  it('given an unguessed word, renders a bar with the same length, its count, and no letters', () => {
    const html = renderArticle(puzzleOf({ kind: 'h1', text: 'Lambda' }), EMPTY_STATE, { highlight: null, labels });
    expect(html).toBe('<h1><span class="redacted" data-len="6" role="img" aria-label="redacted, 6 letters">██████</span></h1>');
  });

  it('given a stopword, renders it visible', () => {
    expect(renderArticle(puzzleOf({ kind: 'p', text: 'the' }), EMPTY_STATE, { highlight: null, labels })).toBe('<p><span>the</span></p>');
  });

  it('given hostile text in a revealed article, escapes it', () => {
    const html = renderArticle(puzzleOf({ kind: 'p', text: 'x <img src=y onerror=z>' }), giveUp(EMPTY_STATE), { highlight: null, labels });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;');
  });

  it('given a highlighted guess, marks every revealed form sharing its lemma as a hit', () => {
    const state = { ...EMPTY_STATE, guesses: ['bucket'] };
    const html = renderArticle(puzzleOf({ kind: 'p', text: 'bucket buckets' }), state, { highlight: 'bucket', labels });
    expect(html).toBe('<p><span class="hit">bucket</span> <span class="hit">buckets</span></p>');
  });

  it('given consecutive list items, wraps them in a single list', () => {
    const html = renderArticle(puzzleOf({ kind: 'li', text: '1' }, { kind: 'li', text: '2' }, { kind: 'p', text: '3' }), EMPTY_STATE, { highlight: null, labels });
    expect(html).toBe('<ul><li><span>1</span></li><li><span>2</span></li></ul><p><span>3</span></p>');
  });
});
