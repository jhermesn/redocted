import type * as v from 'valibot';
import type { ArticleSchema, CorpusIndexSchema } from './schemas.ts';

export type CorpusId = 'aws' | 'k8s';

// The schemas are the single definition of the corpus data; these are views.
export type Article = v.InferOutput<typeof ArticleSchema>;
export type Block = Article['blocks'][number];
export type BlockKind = Block['kind'];
export type CorpusIndex = v.InferOutput<typeof CorpusIndexSchema>;
export type Season = CorpusIndex['seasons'][number];
