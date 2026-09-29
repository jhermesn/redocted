import { foldWord, isVisible, isWord, lemmasOf, tokenize } from './normalize.ts';
import type { Article } from './types.ts';

export interface GameState {
  // Folded words as the player typed them; matching always goes through lemmas.
  guesses: string[];
  solved: boolean;
  gaveUp: boolean;
}

export interface Puzzle {
  article: Article;
  bodyLemmas: readonly (readonly string[])[];
  titleLemmas: readonly (readonly string[])[];
}

export type GuessResult =
  | { kind: 'invalid' }
  | { kind: 'visible' }
  | { kind: 'repeat'; word: string }
  | { kind: 'ok'; word: string; hits: number };

export const MAX_GUESS_LENGTH = 40;

export const EMPTY_STATE: GameState = { guesses: [], solved: false, gaveUp: false };

export function buildPuzzle(article: Article): Puzzle {
  const lemmasByBlock = (kind: 'title' | 'body') =>
    article.blocks
      .filter((block) => (kind === 'title') === (block.kind === 'h1'))
      .flatMap((block) => tokenize(block.text))
      .filter((token) => token.isWord && !isVisible(article.lemmas, token.text))
      .map((token) => lemmasOf(article.lemmas, token.text));
  const titleLemmas = lemmasByBlock('title');
  return { article, titleLemmas, bodyLemmas: [...titleLemmas, ...lemmasByBlock('body')] };
}

export function hitsFor(puzzle: Puzzle, word: string): number {
  if (isVisible(puzzle.article.lemmas, word)) return 0;
  const lemmas = lemmasOf(puzzle.article.lemmas, word);
  return puzzle.bodyLemmas.filter((tokenLemmas) => sharesLemma(tokenLemmas, lemmas)).length;
}

export function applyGuess(state: GameState, puzzle: Puzzle, raw: string): { state: GameState; result: GuessResult } {
  const word = raw.trim();
  if (state.solved || state.gaveUp || word.length > MAX_GUESS_LENGTH || !isWord(word)) return { state, result: { kind: 'invalid' } };
  if (isVisible(puzzle.article.lemmas, word)) return { state, result: { kind: 'visible' } };

  const lemmas = lemmasOf(puzzle.article.lemmas, word);
  const earlier = state.guesses.find((guess) => sharesLemma(lemmasOf(puzzle.article.lemmas, guess), lemmas));
  if (earlier !== undefined) return { state, result: { kind: 'repeat', word: earlier } };

  const guesses = [...state.guesses, foldWord(word)];
  const next = { ...state, guesses };
  const solved = puzzle.titleLemmas.every((titleLemmas) => isGuessed(next, puzzle, titleLemmas));
  return { state: { ...next, solved }, result: { kind: 'ok', word: foldWord(word), hits: hitsFor(puzzle, word) } };
}

export function isRevealed(state: GameState, puzzle: Puzzle, word: string): boolean {
  if (state.solved || state.gaveUp || isVisible(puzzle.article.lemmas, word)) return true;
  return isGuessed(state, puzzle, lemmasOf(puzzle.article.lemmas, word));
}

export function sharesLemma(a: readonly string[], b: readonly string[]): boolean {
  return a.some((lemma) => b.includes(lemma));
}

export function giveUp(state: GameState): GameState {
  return { ...state, gaveUp: true };
}

export function accuracy(state: GameState, puzzle: Puzzle): number {
  if (state.guesses.length === 0) return 0;
  const hits = state.guesses.filter((guess) => hitsFor(puzzle, guess) > 0).length;
  return hits / state.guesses.length;
}

function isGuessed(state: GameState, puzzle: Puzzle, lemmas: readonly string[]): boolean {
  return state.guesses.some((guess) => sharesLemma(lemmasOf(puzzle.article.lemmas, guess), lemmas));
}
