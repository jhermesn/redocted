export type CorpusId = 'aws' | 'k8s';

export type BlockKind = 'h1' | 'h2' | 'h3' | 'p' | 'li';

export interface Block {
  kind: BlockKind;
  text: string;
}

export interface Article {
  id: string;
  corpus: CorpusId;
  title: string;
  sourceUrl: string;
  license: string;
  licenseUrl?: string;
  blocks: Block[];
  // Folded word form → lemmas. Forms whose only lemma is themselves are omitted.
  lemmas: Record<string, string[]>;
}

export interface Season {
  startPuzzle: number;
  salt: string;
  ids: string[];
}

export interface CorpusIndex {
  corpus: CorpusId;
  seasons: Season[];
}
