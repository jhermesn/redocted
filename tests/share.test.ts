import { describe, expect, it } from 'vitest';
import { getMessages } from '../src/i18n/index.ts';
import { shareText } from '../src/lib/share.ts';

const solved = {
  corpus: 'aws' as const,
  puzzle: 12,
  state: { guesses: Array.from({ length: 34 }, (_, i) => `w${i}`), hints: ['bucket', 'policy'], solved: true, gaveUp: false },
  accuracyRatio: 0.8235,
  url: 'https://jhermesn.dev/redocted/?c=aws&p=12',
};

describe('shareText', () => {
  it('given a solved game in English, formats corpus, number, guesses, accuracy, hints and link', () => {
    expect(shareText(solved, getMessages('en'))).toBe(
      'Redocted AWS #12 ✅\n🔎 34 guesses · 🎯 82% accuracy · 💡 2 hints\nhttps://jhermesn.dev/redocted/?c=aws&p=12',
    );
  });

  it('given pt-br, localizes the stats line', () => {
    expect(shareText(solved, getMessages('pt-br')).split('\n')[1]).toBe('🔎 34 palpites · 🎯 82% precisão · 💡 2 dicas');
  });

  it('given a game given up, shows the white flag', () => {
    const gaveUp = { ...solved, corpus: 'k8s' as const, puzzle: 3, state: { guesses: ['a'], hints: [], solved: false, gaveUp: true } };
    expect(shareText(gaveUp, getMessages('en')).split('\n')[0]).toBe('Redocted Kubernetes #3 🏳️');
  });
});
