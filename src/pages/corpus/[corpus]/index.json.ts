import type { APIRoute, GetStaticPaths } from 'astro';
import { corpusIndexOf } from '../../../../scripts/corpus/bundles.ts';
import { parseSourceFile } from '../../../../scripts/corpus/source.ts';
import { CORPORA } from '../../../lib/corpora.ts';

// The index is derived from the manifest at build time, so it is never
// committed twice.
const manifests = import.meta.glob<string>('/corpus/*/manifest.json', { query: '?raw', import: 'default', eager: true });

export const getStaticPaths = (() => CORPORA.map((corpus) => ({ params: { corpus } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const source = parseSourceFile(JSON.parse(manifests[`/corpus/${params.corpus}/manifest.json`]));
  return new Response(JSON.stringify(corpusIndexOf(source)));
};
