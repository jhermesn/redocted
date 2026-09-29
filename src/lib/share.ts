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

export interface ShareLink {
  network: string;
  href: string;
}

// Each network's own share intent; the text is only prefilled, the player
// still reviews and posts it there.
const SHARE_INTENTS: readonly { network: string; compose: (body: string, url: string) => string }[] = [
  { network: 'X', compose: (body, url) => withQuery('https://x.com/intent/post', { text: `${body}\n${url}` }) },
  { network: 'Bluesky', compose: (body, url) => withQuery('https://bsky.app/intent/compose', { text: `${body}\n${url}` }) },
  { network: 'LinkedIn', compose: (body, url) => withQuery('https://www.linkedin.com/feed/', { shareActive: 'true', text: `${body}\n${url}` }) },
  { network: 'WhatsApp', compose: (body, url) => withQuery('https://wa.me/', { text: `${body}\n${url}` }) },
  { network: 'Telegram', compose: (body, url) => withQuery('https://t.me/share/url', { url, text: body }) },
];

export function shareText(input: ShareInput, messages: Messages): string {
  return `${shareBody(input, messages)}\n${input.url}`;
}

export function shareLinks(input: ShareInput, messages: Messages): ShareLink[] {
  const body = shareBody(input, messages);
  return SHARE_INTENTS.map(({ network, compose }) => ({ network, href: compose(body, input.url) }));
}

function shareBody({ corpus, puzzle, state, accuracyRatio }: ShareInput, messages: Messages): string {
  const label = CORPUS_LABEL[corpus];
  return [
    `Redocted ${label} #${puzzle} ${state.solved ? '✅' : '🏳️'}`,
    state.solved ? messages.shareSolved(label) : messages.shareGaveUp(label),
    messages.shareStatsLine(state.guesses.length, Math.round(accuracyRatio * 100), state.hints.length),
  ].join('\n');
}

// encodeURIComponent, not URLSearchParams: some intents read "+" literally.
function withQuery(base: string, params: Record<string, string>): string {
  const query = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return `${base}?${query.join('&')}`;
}
