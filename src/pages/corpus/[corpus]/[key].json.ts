import type { APIRoute, GetStaticPaths } from 'astro';
import * as v from 'valibot';
import { ArticleSchema } from '../../../lib/schemas.ts';

// Serves each committed article; parsing here makes a malformed file fail the
// build instead of reaching players.
const articles = import.meta.glob<string>('/corpus/*/articles/*.json', { query: '?raw', import: 'default', eager: true });

export const getStaticPaths = (() =>
  Object.keys(articles).map((path) => {
    const [, , corpus, , file] = path.split('/');
    return { params: { corpus, key: file.replace(/\.json$/, '') }, props: { path } };
  })) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => new Response(JSON.stringify(v.parse(ArticleSchema, JSON.parse(articles[props.path as string]))));
