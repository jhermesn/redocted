import * as v from 'valibot';
import { CORPORA, CORPUS_HOSTS } from '../../src/lib/corpora.ts';

const HttpsUrl = v.pipe(v.string(), v.url(), v.startsWith('https://'));

const SourcePageSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  docsUrl: HttpsUrl,
});

const SourceSeasonSchema = v.object({
  startPuzzle: v.pipe(v.number(), v.integer(), v.minValue(1)),
  salt: v.pipe(v.string(), v.nonEmpty()),
  pages: v.array(SourcePageSchema),
});

const SourceFileSchema = v.pipe(
  v.object({
    corpus: v.picklist(CORPORA),
    license: v.pipe(v.string(), v.nonEmpty()),
    licenseUrl: v.optional(HttpsUrl),
    seasons: v.array(SourceSeasonSchema),
  }),
  v.check(
    (source) => source.seasons.every((season) => season.pages.every((page) => new URL(page.docsUrl).hostname === CORPUS_HOSTS[source.corpus])),
    'every page must be on the documentation site of its corpus',
  ),
);

export type SourcePage = v.InferOutput<typeof SourcePageSchema>;
export type SourceSeason = v.InferOutput<typeof SourceSeasonSchema>;
export type SourceFile = v.InferOutput<typeof SourceFileSchema>;

export function parseSourceFile(value: unknown): SourceFile {
  return v.parse(SourceFileSchema, value);
}
