import { plural } from './plural.ts';

const guessCount = (guesses: number): string => plural('en', guesses, { one: 'guess', other: 'guesses' });

export const en = {
  languageName: 'English',
  pageTitle: 'Redocted · guess the docs',
  pageDescription: 'Daily game: reveal a redacted page from the AWS or Kubernetes documentation by guessing words.',
  corpusNavLabel: 'Documentation',
  languageNavLabel: 'Language',
  noscript: 'Redocted needs JavaScript: the article of the day is picked and redacted in your browser.',
  loading: 'Loading…',
  loadFailed: "Couldn't load today's article. Try reloading the page.",
  guessLabel: 'Guess',
  guessPlaceholder: 'Type a word',
  guessSubmit: 'Guess',
  giveUp: 'Give up',
  giveUpConfirm: 'Tap again to give up',
  previous: '← previous',
  howToPlayTitle: 'How to play',
  howToPlayBody:
    'A documentation page is hidden behind black bars. Every word you guess is revealed everywhere it appears. Reveal every word of the title to win. Common words and numbers are already visible. The articles are in English. New puzzle every day at 00:00 UTC.',
  columnNumber: '#',
  columnWord: 'Word',
  columnHits: 'Hits',
  feedbackInvalid: 'Type a single word (letters and numbers only).',
  feedbackVisible: 'That word is already visible.',
  feedbackRepeat: (key: string): string => `You already tried “${key}”.`,
  feedbackHits: (hits: number): string => (hits === 0 ? 'No matches.' : `${plural('en', hits, { one: 'match', other: 'matches' })}.`),
  meta: (corpusLabel: string, puzzle: number, guesses: number): string => `${corpusLabel} #${puzzle} · ${guessCount(guesses)}`,
  resultSolved: (title: string): string => `You got it: ${title}`,
  resultGaveUp: (title: string): string => `It was: ${title}`,
  resultSummary: (guesses: number, percent: number): string => `${guessCount(guesses)} · ${percent}% accuracy`,
  resultStats: (played: number, won: number, streak: number, maxStreak: number): string =>
    `Played: ${played} · Won: ${won} · Streak: ${streak} (best ${maxStreak})`,
  shareStatsLine: (guesses: number, percent: number): string => `🔎 ${guessCount(guesses)} · 🎯 ${percent}% accuracy`,
  readSource: 'Read the official docs ↗',
  attribution: (license: string): string => `Text: ${license} · Excerpt, modified for this game`,
  redactedWord: (letters: number): string => `hidden word, ${plural('en', letters, { one: 'letter', other: 'letters' })}`,
  guessHighlight: (word: string): string => `Show “${word}” in the article`,
  licenseLink: 'License',
  showResult: 'Show result',
  showLetterCounts: 'Show letter counts',
  share: 'Copy result',
  shareCopied: 'Copied!',
  shareFailed: "Couldn't copy.",
  close: 'Close',
  footerBy: 'A game by',
  footerNote: 'Not affiliated with AWS or the CNCF. Every article shows its license, and links its source once the game is over.',
};

export type Messages = typeof en;
