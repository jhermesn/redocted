import { createHash } from 'node:crypto';
import type { CorpusId } from '../../src/lib/types.ts';
import type { SourcePage } from './source.ts';

const KEY_LENGTH = 16;

// Opaque so the file name in the network tab does not spoil the answer.
export function bundleKey(corpus: CorpusId, pageId: string): string {
  return createHash('sha256').update(`${corpus}:${pageId}`).digest('hex').slice(0, KEY_LENGTH);
}

export interface BuildOptions {
  existingFiles: ReadonlySet<string>;
  refresh: boolean;
  // Pages of seasons that have started: their articles are live and frozen.
  frozenIds: ReadonlySet<string>;
}

// Bundles are append-only: once a page is published its article must not
// change under players, so only pages without a bundle are fetched, and a
// refresh only rebuilds pages that are not live yet.
export function pagesToBuild(corpus: CorpusId, pages: readonly SourcePage[], { existingFiles, refresh, frozenIds }: BuildOptions): SourcePage[] {
  return pages.filter((page) =>
    refresh ? !frozenIds.has(page.id) : !existingFiles.has(`${bundleKey(corpus, page.id)}.json`),
  );
}
