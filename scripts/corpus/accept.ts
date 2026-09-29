import type { Article } from '../../src/lib/types.ts';
import { isRetired } from './lifecycle.ts';
import { qualityProblems } from './quality.ts';

export interface AcceptContext {
  // Lower-cased titles already used by pages in a season.
  knownTitles: ReadonlySet<string>;
  retiredNames: ReadonlySet<string>;
}

export interface AcceptResult {
  accepted: Article[];
  skipped: { id: string; reasons: string[] }[];
}

// A discovered article joins only when it makes a fair puzzle, its service is
// not retired, and no other page of the board already uses its title.
export function acceptArticles(articles: readonly Article[], { knownTitles, retiredNames }: AcceptContext): AcceptResult {
  const titles = new Set(knownTitles);
  const result: AcceptResult = { accepted: [], skipped: [] };
  for (const article of articles) {
    const reasons = qualityProblems(article);
    if (isRetired(article.title, retiredNames)) reasons.push(`AWS lists "${article.title}" as retired`);
    if (titles.has(article.title.toLowerCase())) reasons.push(`title "${article.title}" is already used`);
    if (reasons.length > 0) {
      result.skipped.push({ id: article.id, reasons });
      continue;
    }
    titles.add(article.title.toLowerCase());
    result.accepted.push(article);
  }
  return result;
}
