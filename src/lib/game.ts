import { foldWord, isVisible, isWord, lemmasOf, tokenize } from './normalize.ts';
import type { Article } from './types.ts';

export interface GameState {
  // Folded words as the player typed them; matching always goes through lemmas.
  guesses: string[];
  // Folded words revealed on request; they never count as guesses.
  hints: string[];
  solved: boolean;
  gaveUp: boolean;
}

export interface Puzzle {
  article: Article;
  bodyLemmas: readonly (readonly string[])[];
  titleLemmas: readonly (readonly string[])[];
  // Hidden body words that share no lemma with the title, most hits first, so
  // hints help without ever solving the game.
  hintWords: readonly string[];
}

export type GuessResult =
  | { kind: 'invalid' }
  | { kind: 'visible' }
  | { kind: 'repeat'; word: string }
  | { kind: 'ok'; word: string; hits: number };

export const MAX_GUESS_LENGTH = 40;

export const EMPTY_STATE: GameState = { guesses: [], hints: [], solved: false, gaveUp: false };

export function buildPuzzle(article: Article): Puzzle {
  const hiddenWords = (kind: 'title' | 'body') =>
    article.blocks
      .filter((block) => (kind === 'title') === (block.kind === 'h1'))
      .flatMap((block) => tokenize(block.text))
      .filter((token) => token.isWord && !isVisible(article.lemmas, token.text))
      .map((token) => foldWord(token.text));
  const lemmasFor = (words: string[]) => words.map((word) => lemmasOf(article.lemmas, word));
  const bodyWords = hiddenWords('body');
  const titleLemmas = lemmasFor(hiddenWords('title'));
  const puzzle = { article, titleLemmas, bodyLemmas: [...titleLemmas, ...lemmasFor(bodyWords)] };
  return { ...puzzle, hintWords: rankHintWords(puzzle, bodyWords) };
}

export function hitsFor(puzzle: Pick<Puzzle, 'article' | 'bodyLemmas'>, word: string): number {
  if (isVisible(puzzle.article.lemmas, word)) return 0;
  const lemmas = lemmasOf(puzzle.article.lemmas, word);
  return puzzle.bodyLemmas.filter((tokenLemmas) => sharesLemma(tokenLemmas, lemmas)).length;
}

export function applyGuess(state: GameState, puzzle: Puzzle, raw: string): { state: GameState; result: GuessResult } {
  const word = raw.trim();
  if (state.solved || state.gaveUp || word.length > MAX_GUESS_LENGTH || !isWord(word)) return { state, result: { kind: 'invalid' } };
  const lemmas = lemmasOf(puzzle.article.lemmas, word);
  if (isVisible(puzzle.article.lemmas, word) || sharesLemmaWithAny(state.hints, puzzle, lemmas)) return { state, result: { kind: 'visible' } };

  const earlier = state.guesses.find((guess) => sharesLemma(lemmasOf(puzzle.article.lemmas, guess), lemmas));
  if (earlier !== undefined) return { state, result: { kind: 'repeat', word: earlier } };

  const guesses = [...state.guesses, foldWord(word)];
  const next = { ...state, guesses };
  const solved = puzzle.titleLemmas.every((titleLemmas) => sharesLemmaWithAny(next.guesses, puzzle, titleLemmas));
  return { state: { ...next, solved }, result: { kind: 'ok', word: foldWord(word), hits: hitsFor(puzzle, word) } };
}

export function isRevealed(state: GameState, puzzle: Puzzle, word: string): boolean {
  if (state.solved || state.gaveUp || isVisible(puzzle.article.lemmas, word)) return true;
  const lemmas = lemmasOf(puzzle.article.lemmas, word);
  return sharesLemmaWithAny(state.guesses, puzzle, lemmas) || sharesLemmaWithAny(state.hints, puzzle, lemmas);
}

export function sharesLemma(a: readonly string[], b: readonly string[]): boolean {
  return a.some((lemma) => b.includes(lemma));
}

export function giveUp(state: GameState): GameState {
  return { ...state, gaveUp: true };
}

export function takeHint(state: GameState, puzzle: Puzzle): { state: GameState; word: string } | null {
  if (state.solved || state.gaveUp) return null;
  const word = puzzle.hintWords.find((candidate) => !isRevealed(state, puzzle, candidate));
  if (word === undefined) return null;
  return { state: { ...state, hints: [...state.hints, word] }, word };
}

export function accuracy(state: GameState, puzzle: Puzzle): number {
  if (state.guesses.length === 0) return 0;
  const hits = state.guesses.filter((guess) => hitsFor(puzzle, guess) > 0).length;
  return hits / state.guesses.length;
}

function sharesLemmaWithAny(words: readonly string[], puzzle: Puzzle, lemmas: readonly string[]): boolean {
  return words.some((word) => sharesLemma(lemmasOf(puzzle.article.lemmas, word), lemmas));
}

// A stable sort keeps reading order among words with the same number of hits.
function rankHintWords(puzzle: Omit<Puzzle, 'hintWords'>, bodyWords: readonly string[]): string[] {
  const inTitle = (word: string) => puzzle.titleLemmas.some((lemmas) => sharesLemma(lemmas, lemmasOf(puzzle.article.lemmas, word)));
  return [...new Set(bodyWords)]
    .filter((word) => !inTitle(word))
    .map((word) => ({ word, hits: hitsFor(puzzle, word) }))
    .sort((a, b) => b.hits - a.hits)
    .map(({ word }) => word);
}
