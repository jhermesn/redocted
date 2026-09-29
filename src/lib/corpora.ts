import type { CorpusId } from './types.ts';

export const CORPUS_LABEL: Record<CorpusId, string> = { aws: 'AWS', k8s: 'Kubernetes' };

export const CORPORA = Object.keys(CORPUS_LABEL) as CorpusId[];

// Where each board's articles must come from; source links are checked
// against it before they reach the page.
export const CORPUS_HOSTS: Record<CorpusId, string> = { aws: 'docs.aws.amazon.com', k8s: 'kubernetes.io' };

export function parseCorpus(value: string | null): CorpusId {
  return CORPORA.find((corpus) => corpus === value) ?? CORPORA[0];
}
