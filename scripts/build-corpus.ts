import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import pLimit from 'p-limit';
import pRetry, { AbortError } from 'p-retry';
import pkg from '../package.json' with { type: 'json' };
import { CORPORA } from '../src/lib/corpora.ts';
import { currentPuzzle } from '../src/lib/daily.ts';
import { isAlwaysVisible, tokenize } from '../src/lib/normalize.ts';
import type { Article, CorpusId } from '../src/lib/types.ts';
import { acceptArticles } from './corpus/accept.ts';
import { bundleKey, pagesToBuild } from './corpus/bundles.ts';
import { awsGuideRoots, awsLandingUrl, k8sConceptPages, type FetchedPage } from './corpus/discover.ts';
import { extractArticle } from './corpus/extract.ts';
import { buildLemmaTable } from './corpus/lemmas.ts';
import { AWS_LIFECYCLE_PAGES, isRetired, retiredServiceNames } from './corpus/lifecycle.ts';
import { qualityProblems } from './corpus/quality.ts';
import { discoveryProblems, withNewPages } from './corpus/seasons.ts';
import { parseSourceFile, type SourceFile, type SourcePage } from './corpus/source.ts';

const FETCH_TIMEOUT_MS = 15_000;
const FETCH_RETRIES = 3;
const CONCURRENCY = 4;
const LEAD_DAYS = 14;
const LAYOUT_SAMPLE_SIZE = 3;
const USER_AGENT = `${pkg.name}-corpus-builder (+${pkg.homepage})`;

interface Candidate {
  id: string;
  // Resolves the page to read; AWS guide roots redirect to their landing page.
  resolve: () => Promise<SourcePage>;
}

interface CorpusSource {
  sitemap: string;
  candidates: (sitemapXml: string) => Candidate[];
  lifecyclePages: readonly string[];
}

const SOURCES: Record<CorpusId, CorpusSource> = {
  aws: {
    sitemap: 'https://docs.aws.amazon.com/sitemap_index.xml',
    candidates: (xml) =>
      awsGuideRoots(xml).map((root) => ({
        id: root.id,
        resolve: async () => ({ id: root.id, docsUrl: awsLandingUrl(root.rootUrl, await fetchPage(root.rootUrl)) }),
      })),
    lifecyclePages: AWS_LIFECYCLE_PAGES,
  },
  k8s: {
    sitemap: 'https://kubernetes.io/en/sitemap.xml',
    candidates: (xml) => k8sConceptPages(xml).map((page) => ({ id: page.id, resolve: async () => page })),
    lifecyclePages: [],
  },
};

// Retries transient failures (network errors, 5xx); a 4xx is final.
function fetchPage(url: string): Promise<FetchedPage> {
  return pRetry(
    async () => {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'user-agent': USER_AGENT } });
      if (response.status >= 400 && response.status < 500) throw new AbortError(`failed to fetch ${url}: HTTP ${response.status}`);
      if (!response.ok) throw new Error(`failed to fetch ${url}: HTTP ${response.status}`);
      return { url: response.url, html: await response.text() };
    },
    { retries: FETCH_RETRIES },
  );
}

// Keeps a few requests in flight so a full discovery run stays polite to the
// documentation sites; results keep the input order.
const limit = pLimit(CONCURRENCY);
function mapLimited<T, R>(items: readonly T[], work: (item: T) => Promise<R>): Promise<R[]> {
  return Promise.all(items.map((item) => limit(() => work(item))));
}

async function buildArticle(source: SourceFile, page: SourcePage): Promise<Article> {
  const { title, blocks } = extractArticle(source.corpus, (await fetchPage(page.docsUrl)).html);
  const words = blocks.flatMap((block) => tokenize(block.text)).filter((token) => token.isWord && !isAlwaysVisible(token.text));
  const lemmas = buildLemmaTable(words.map((token) => token.text));
  return { id: page.id, corpus: source.corpus, title, sourceUrl: page.docsUrl, license: source.license, licenseUrl: source.licenseUrl, blocks, lemmas };
}

async function writeBundle(outDir: string, article: Article): Promise<void> {
  const key = bundleKey(article.corpus, article.id);
  await writeFile(`${outDir}/${key}.json`, JSON.stringify(article));
  console.log(`${article.corpus}/${article.id} -> ${key}.json  "${article.title}"  ${article.blocks.length} blocks`);
}

async function readBundle(outDir: string, source: SourceFile, page: SourcePage): Promise<Article> {
  return JSON.parse(await readFile(`${outDir}/${bundleKey(source.corpus, page.id)}.json`, 'utf8')) as Article;
}

// Published articles are never re-fetched, so a site redesign would otherwise
// go unnoticed until every new candidate quietly failed. Re-extracting a few
// known pages (without writing them) turns that into a loud failure.
async function checkSiteLayout(source: SourceFile, knownPages: readonly SourcePage[]): Promise<void> {
  await mapLimited(knownPages.slice(0, LAYOUT_SAMPLE_SIZE), async (page) => {
    try {
      await buildArticle(source, page);
    } catch (error) {
      throw new Error(`${source.corpus} layout check failed on ${page.docsUrl}: ${(error as Error).message}`);
    }
  });
}

// Pages already in a season must build and pass the quality checks; anything
// else is a maintainer error and stops the run.
async function buildKnownPages(source: SourceFile, outDir: string, refresh: boolean): Promise<void> {
  const today = currentPuzzle(new Date());
  const known = [...new Map(source.seasons.flatMap((season) => season.pages).map((page) => [page.id, page])).values()];
  const frozenIds = new Set(source.seasons.filter((season) => season.startPuzzle <= today).flatMap((season) => season.pages.map((page) => page.id)));
  const pending = pagesToBuild(source.corpus, known, { existingFiles: new Set(await readdir(outDir)), refresh, frozenIds });
  await mapLimited(pending, async (page) => {
    const article = await buildArticle(source, page);
    const problems = qualityProblems(article);
    if (problems.length > 0) throw new Error(`${source.corpus}/${page.id}: ${problems.join('; ')}`);
    await writeBundle(outDir, article);
  });
}

async function discoverCandidates(corpus: CorpusId, knownIds: ReadonlySet<string>): Promise<Candidate[]> {
  const candidates = SOURCES[corpus].candidates((await fetchPage(SOURCES[corpus].sitemap)).html);
  const problems = discoveryProblems(corpus, [...knownIds], candidates.map((candidate) => candidate.id));
  if (problems.length > 0) throw new Error(problems.join('; '));
  return candidates.filter((candidate) => !knownIds.has(candidate.id));
}

async function buildCorpus(corpus: CorpusId, refresh: boolean): Promise<void> {
  const sourcePath = `corpus/${corpus}/manifest.json`;
  const source = parseSourceFile(JSON.parse(await readFile(sourcePath, 'utf8')));
  const outDir = `corpus/${corpus}/articles`;
  await mkdir(outDir, { recursive: true });

  await buildKnownPages(source, outDir, refresh);
  const knownPages = source.seasons.flatMap((season) => season.pages);
  await checkSiteLayout(source, knownPages);
  const retiredNames = retiredServiceNames(await Promise.all(SOURCES[corpus].lifecyclePages.map(async (url) => (await fetchPage(url)).html)));
  const knownArticles = await Promise.all(knownPages.map((page) => readBundle(outDir, source, page)));

  const candidates = await discoverCandidates(corpus, new Set(knownPages.map((page) => page.id)));
  const built = await mapLimited(candidates, async (candidate) => {
    try {
      return await buildArticle(source, await candidate.resolve());
    } catch (error) {
      console.log(`skip ${corpus}/${candidate.id}: ${(error as Error).message}`);
      return null;
    }
  });
  const { accepted, skipped } = acceptArticles(
    built.filter((article): article is Article => article !== null),
    { knownTitles: new Set(knownArticles.map((article) => article.title.toLowerCase())), retiredNames },
  );
  skipped.forEach(({ id, reasons }) => console.log(`skip ${corpus}/${id}: ${reasons.join('; ')}`));
  await Promise.all(accepted.map((article) => writeBundle(outDir, article)));

  const retiredIds = new Set(knownArticles.filter((article) => isRetired(article.title, retiredNames)).map((article) => article.id));
  const newPages = accepted.map((article) => ({ id: article.id, docsUrl: article.sourceUrl }));
  const seasons = [...withNewPages(corpus, source.seasons, newPages, { today: currentPuzzle(new Date()), leadDays: LEAD_DAYS, retiredIds })];
  console.log(`${corpus}: ${accepted.length} new pages, ${retiredIds.size} retired, ${seasons.at(-1)?.pages.length ?? 0} in the latest season`);

  await writeFile(sourcePath, `${JSON.stringify({ ...source, seasons }, null, 2)}\n`);
}

const { values, positionals } = parseArgs({ options: { refresh: { type: 'boolean', default: false } }, allowPositionals: true });
const unknownCorpora = positionals.filter((name) => !(CORPORA as readonly string[]).includes(name));
if (unknownCorpora.length > 0) throw new Error(`unknown corpus: ${unknownCorpora.join(', ')} (expected ${CORPORA.join(', ')})`);
for (const corpus of positionals.length > 0 ? (positionals as CorpusId[]) : CORPORA) {
  await buildCorpus(corpus, values.refresh);
}
