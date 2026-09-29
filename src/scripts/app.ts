import { getMessages, parseLocale, type Messages } from '../i18n/index.ts';
import { CORPUS_LABEL, parseCorpus } from '../lib/corpora.ts';
import { articleIdFor, currentPuzzle, resolvePuzzle } from '../lib/daily.ts';
import { accuracy, applyGuess, buildPuzzle, giveUp, hitsFor, takeHint, type GameState, type GuessResult, type Puzzle } from '../lib/game.ts';
import { renderArticle } from '../lib/render.ts';
import { shareLinks, shareText, type ShareInput } from '../lib/share.ts';
import { countsTowardStats, currentStreak, loadSettings, loadState, loadStats, recordResult, saveSettings, saveState, saveStats, type KeyValueStore } from '../lib/storage.ts';
import * as v from 'valibot';
import { ArticleSchema, CorpusIndexSchema } from '../lib/schemas.ts';
import type { Article } from '../lib/types.ts';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const t = getMessages(parseLocale(document.documentElement.dataset.locale));

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing element #${id}`);
  return node as T;
}

async function fetchValid<T>(path: string, schema: v.GenericSchema<T>): Promise<T> {
  const response = await fetch(`${base}/${path}`);
  if (!response.ok) throw new Error(`failed to load ${path}: HTTP ${response.status}`);
  return v.parse(schema, await response.json());
}

// Always visible, and without the source URL so it cannot spoil the title.
function renderAttribution(element: HTMLElement, article: Article): void {
  const parts: Node[] = [document.createTextNode(t.attribution(article.license))];
  if (article.licenseUrl) {
    const link = Object.assign(document.createElement('a'), { href: article.licenseUrl, textContent: t.licenseLink, target: '_blank', rel: 'noopener noreferrer' });
    link.className = 'underline';
    parts.push(document.createTextNode(' · '), link);
  }
  element.replaceChildren(...parts);
}

function feedbackFor(result: GuessResult, messages: Messages): string {
  switch (result.kind) {
    case 'invalid':
      return messages.feedbackInvalid;
    case 'visible':
      return messages.feedbackVisible;
    case 'repeat':
      return messages.feedbackRepeat(result.word);
    case 'ok':
      return messages.feedbackHits(result.hits);
  }
}

function isFinished(state: GameState): boolean {
  return state.solved || state.gaveUp;
}

// Pins the puzzle number so switching language right after the UTC rollover
// keeps the game the player is in.
function pinPuzzleOnLanguageLinks(query: string): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-locale-link]').forEach((link) => {
    link.search = query;
  });
}

function setUpLetterCounts(store: KeyValueStore | null, articleEl: HTMLElement): void {
  const toggle = byId<HTMLInputElement>('show-counts');
  const apply = (show: boolean) => document.documentElement.classList.toggle('show-letter-counts', show);
  toggle.checked = loadSettings(store).showLetterCounts;
  apply(toggle.checked);
  toggle.addEventListener('change', () => {
    apply(toggle.checked);
    saveSettings(store, { showLetterCounts: toggle.checked });
  });
  articleEl.addEventListener('click', (event) => {
    (event.target as HTMLElement).closest('.redacted')?.classList.toggle('peek');
  });
}

function cell(content: string | Node): HTMLTableCellElement {
  const element = document.createElement('td');
  element.append(content);
  return element;
}

// Each guess is a button so keyboards and screen readers can jump to it.
function renderGuessList(state: GameState, puzzle: Puzzle, onSelect: (word: string) => void): void {
  const rows = state.guesses.map((guess, i) => {
    const button = Object.assign(document.createElement('button'), { type: 'button', textContent: guess, className: 'guess-word' });
    button.setAttribute('aria-label', t.guessHighlight(guess));
    button.addEventListener('click', () => onSelect(guess));
    const row = document.createElement('tr');
    row.append(cell(String(i + 1)), cell(button), cell(String(hitsFor(puzzle, guess))));
    return row;
  });
  byId('guess-list').replaceChildren(...rows.reverse());
}

function renderShareLinks(input: ShareInput): void {
  const items = shareLinks(input, t).map(({ network, href }) => {
    const link = Object.assign(document.createElement('a'), { href, textContent: network, target: '_blank', rel: 'noopener noreferrer', className: 'btn-ghost' });
    link.setAttribute('aria-label', t.shareOnNetwork(network));
    const item = document.createElement('li');
    item.append(link);
    return item;
  });
  byId('share-links').replaceChildren(...items);
}

// The Web Share API reaches every app installed on the device, mostly on mobile.
function setUpNativeShare(input: ShareInput): void {
  const button = byId<HTMLButtonElement>('share-native');
  const data = { text: shareText(input, t) };
  button.hidden = typeof navigator.share !== 'function' || !navigator.canShare?.(data);
  button.onclick = () => {
    navigator.share(data).catch(() => undefined);
  };
}

async function main(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const corpus = parseCorpus(params.get('c'));
  const today = currentPuzzle(new Date());
  const puzzle = resolvePuzzle(params.get('p'), today);
  const store = browserStore();

  pinPuzzleOnLanguageLinks(`?c=${corpus}&p=${puzzle}`);
  byId(`tab-${corpus}`).setAttribute('aria-current', 'page');
  const index = await fetchValid(`corpus/${corpus}/index.json`, CorpusIndexSchema);
  const articleId = articleIdFor(index, puzzle);
  const article = await fetchValid(`corpus/${corpus}/${articleId}.json`, ArticleSchema);
  const board = buildPuzzle(article);
  const slot = { corpus, puzzle, articleId };
  renderAttribution(byId('attribution'), article);
  renderAttribution(byId('result-attribution'), article);

  let state = loadState(store, slot);
  let highlight: string | null = null;
  let hitCursor = -1;

  const articleEl = byId('article');
  const input = byId<HTMLInputElement>('guess-input');
  const dialog = byId<HTMLDialogElement>('result');
  setUpLetterCounts(store, articleEl);

  function focusNextHit(): void {
    const hits = articleEl.querySelectorAll<HTMLElement>('.hit');
    if (hits.length === 0) return;
    hits[hitCursor]?.classList.remove('current');
    hitCursor = (hitCursor + 1) % hits.length;
    hits[hitCursor].classList.add('current');
    hits[hitCursor].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function render(): void {
    articleEl.innerHTML = renderArticle(board, state, { highlight, labels: { redacted: t.redactedWord } });
    renderGuessList(state, board, select);
    byId('meta').textContent = t.meta(CORPUS_LABEL[corpus], puzzle, state.guesses.length);
    const finished = isFinished(state);
    const giveUpButton = byId<HTMLButtonElement>('give-up');
    giveUpButton.disabled = finished;
    if (finished) {
      delete giveUpButton.dataset.armed;
      giveUpButton.textContent = t.giveUp;
    }
    byId<HTMLButtonElement>('hint').disabled = takeHint(state, board) === null;
    input.disabled = finished;
    byId<HTMLButtonElement>('guess-submit').disabled = finished;
    byId('show-result').hidden = !finished;
  }

  function select(word: string): void {
    if (highlight !== word) {
      highlight = word;
      hitCursor = -1;
      render();
    }
    focusNextHit();
  }

  function showResult(): void {
    const ratio = accuracy(state, board);
    const stats = loadStats(store, corpus);
    const shareInput = { corpus, puzzle, state, accuracyRatio: ratio, url: `${window.location.origin}${window.location.pathname}?c=${corpus}&p=${puzzle}` };
    byId('result-title').textContent = state.solved ? t.resultSolved(article.title) : t.resultGaveUp(article.title);
    byId('result-summary').textContent = t.resultSummary(state.guesses.length, Math.round(ratio * 100), state.hints.length);
    byId('result-stats').textContent = t.resultStats(stats.played, stats.won, currentStreak(stats, today), stats.maxStreak);
    byId<HTMLAnchorElement>('result-source').href = article.sourceUrl;
    const shareButton = byId<HTMLButtonElement>('share');
    shareButton.textContent = t.share;
    shareButton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(shareText(shareInput, t));
        shareButton.textContent = t.shareCopied;
      } catch {
        shareButton.textContent = t.shareFailed;
      }
    };
    setUpNativeShare(shareInput);
    renderShareLinks(shareInput);
    if (!dialog.open) dialog.showModal();
  }

  function commit(next: GameState): void {
    const justFinished = !isFinished(state) && isFinished(next);
    if (countsTowardStats(state, next, { puzzle, today })) {
      saveStats(store, corpus, recordResult(loadStats(store, corpus), puzzle, next.solved));
    }
    state = next;
    saveState(store, slot, state);
    render();
    if (justFinished) showResult();
  }

  byId<HTMLFormElement>('guess-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const { state: next, result } = applyGuess(state, board, input.value);
    byId('feedback').textContent = feedbackFor(result, t);
    input.value = '';
    const revealsSomething = result.kind === 'ok' || result.kind === 'repeat';
    if (revealsSomething) {
      highlight = result.word;
      hitCursor = -1;
    }
    commit(next);
    if (revealsSomething) focusNextHit();
  });

  byId('hint').addEventListener('click', () => {
    const hint = takeHint(state, board);
    if (hint === null) return;
    byId('feedback').textContent = t.feedbackHint(hint.word, hitsFor(board, hint.word));
    highlight = hint.word;
    hitCursor = -1;
    commit(hint.state);
    focusNextHit();
  });

  // Two taps: a stray tap must not end the game and the streak.
  const giveUpButton = byId<HTMLButtonElement>('give-up');
  giveUpButton.addEventListener('click', () => {
    if (giveUpButton.dataset.armed === 'true') {
      commit(giveUp(state));
      return;
    }
    giveUpButton.dataset.armed = 'true';
    giveUpButton.textContent = t.giveUpConfirm;
  });
  giveUpButton.addEventListener('blur', () => {
    delete giveUpButton.dataset.armed;
    giveUpButton.textContent = t.giveUp;
  });
  byId('show-result').addEventListener('click', showResult);

  const previous = byId<HTMLAnchorElement>('prev');
  if (puzzle > 1) previous.href = `?c=${corpus}&p=${puzzle - 1}`;
  else previous.hidden = true;

  render();
}

main().catch((error: unknown) => {
  console.error(error);
  byId('article').textContent = t.loadFailed;
});
