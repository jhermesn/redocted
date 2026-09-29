import { sharesLemma } from '../../src/lib/game.ts';
import { isVisible, lemmasOf, tokenize, type Token } from '../../src/lib/normalize.ts';
import type { Article } from '../../src/lib/types.ts';

export const MIN_BODY_WORDS = 150;

// An article makes a fair puzzle only if there is enough text to reason from
// and every title word can be discovered from the text around it.
export function qualityProblems(article: Article): string[] {
  const hideable = (kind: 'title' | 'body') =>
    article.blocks
      .filter((block) => (kind === 'title') === (block.kind === 'h1'))
      .flatMap((block) => tokenize(block.text))
      .filter((token): token is Token => token.isWord && !isVisible(article.lemmas, token.text));
  const titleWords = hideable('title');
  const bodyWords = hideable('body');
  if (titleWords.length === 0) return ['title has no guessable words'];

  const problems: string[] = [];
  if (bodyWords.length < MIN_BODY_WORDS) problems.push(`only ${bodyWords.length} words of prose (minimum ${MIN_BODY_WORDS})`);
  const bodyLemmas = bodyWords.map((token) => lemmasOf(article.lemmas, token.text));
  for (const word of titleWords) {
    const lemmas = lemmasOf(article.lemmas, word.text);
    if (!bodyLemmas.some((tokenLemmas) => sharesLemma(tokenLemmas, lemmas))) {
      problems.push(`title word "${word.text}" never appears in the text`);
    }
  }
  return problems;
}
