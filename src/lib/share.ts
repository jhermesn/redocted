import type { Messages } from '../i18n/index.ts';
import { CORPUS_LABEL } from './corpora.ts';
import type { GameState } from './game.ts';
import type { CorpusId } from './types.ts';

export interface ShareInput {
  corpus: CorpusId;
  puzzle: number;
  state: GameState;
  accuracyRatio: number;
  url: string;
}

export function shareText({ corpus, puzzle, state, accuracyRatio, url }: ShareInput, messages: Messages): string {
  const outcome = state.solved ? '✅' : '🏳️';
  return [
    `Redocted ${CORPUS_LABEL[corpus]} #${puzzle} ${outcome}`,
    messages.shareStatsLine(state.guesses.length, Math.round(accuracyRatio * 100), state.hints.length),
    url,
  ].join('\n');
}
