import escapeHtml from 'escape-html';
import { isRevealed, sharesLemma, type GameState, type Puzzle } from './game.ts';
import { lemmasOf, tokenize, type Token } from './normalize.ts';
import type { Block } from './types.ts';

const REDACTION_CHAR = '█';

export interface RenderOptions {
  highlight: string | null;
  // Text for assistive technology; the bar itself shows no letters.
  labels: { redacted: (letters: number) => string };
}

export function renderArticle(puzzle: Puzzle, state: GameState, { highlight, labels }: RenderOptions): string {
  const highlightLemmas = highlight === null ? null : lemmasOf(puzzle.article.lemmas, highlight);
  let html = '';
  let inList = false;
  for (const block of puzzle.article.blocks) {
    if (block.kind === 'li' && !inList) html += '<ul>';
    if (block.kind !== 'li' && inList) html += '</ul>';
    inList = block.kind === 'li';
    html += renderBlock(block, (token) => renderToken(token, { puzzle, state, highlightLemmas, labels }));
  }
  return inList ? `${html}</ul>` : html;
}

interface TokenContext {
  puzzle: Puzzle;
  state: GameState;
  highlightLemmas: readonly string[] | null;
  labels: RenderOptions['labels'];
}

function renderBlock(block: Block, renderWord: (token: Token) => string): string {
  const inner = tokenize(block.text).map(renderWord).join('');
  return `<${block.kind}>${inner}</${block.kind}>`;
}

function renderToken(token: Token, { puzzle, state, highlightLemmas, labels }: TokenContext): string {
  if (!token.isWord) return escapeHtml(token.text);
  if (!isRevealed(state, puzzle, token.text)) {
    const length = [...token.text].length;
    return `<span class="redacted" data-len="${length}" role="img" aria-label="${escapeHtml(labels.redacted(length))}">${REDACTION_CHAR.repeat(length)}</span>`;
  }
  const isHit = highlightLemmas !== null && sharesLemma(lemmasOf(puzzle.article.lemmas, token.text), highlightLemmas);
  return `<span${isHit ? ' class="hit"' : ''}>${escapeHtml(token.text)}</span>`;
}
