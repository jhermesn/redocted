import * as v from 'valibot';
import { CORPORA, CORPUS_HOSTS } from './corpora.ts';

const NonEmpty = v.pipe(v.string(), v.nonEmpty());
const HttpsUrl = v.pipe(v.string(), v.url(), v.startsWith('https://'));

// Corpus files are generated, committed and fetched at runtime; they reach
// innerHTML and href, so the browser and CI both validate them.
export const ArticleSchema = v.pipe(
  v.object({
    id: NonEmpty,
    corpus: v.picklist(CORPORA),
    title: NonEmpty,
    sourceUrl: HttpsUrl,
    license: NonEmpty,
    licenseUrl: v.optional(HttpsUrl),
    blocks: v.array(v.object({ kind: v.picklist(['h1', 'h2', 'h3', 'p', 'li']), text: v.string() })),
    // Folded word form → lemmas; forms whose only lemma is themselves are omitted.
    lemmas: v.record(v.string(), v.array(v.string())),
  }),
  v.check((article) => new URL(article.sourceUrl).hostname === CORPUS_HOSTS[article.corpus], 'source URL must be on the documentation site'),
);

export const CorpusIndexSchema = v.object({
  corpus: v.picklist(CORPORA),
  seasons: v.array(
    v.object({
      startPuzzle: v.pipe(v.number(), v.integer(), v.minValue(1)),
      salt: NonEmpty,
      ids: v.array(NonEmpty),
    }),
  ),
});
