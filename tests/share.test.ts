import { describe, expect, it } from 'vitest';
import { getMessages } from '../src/i18n/index.ts';
import { shareLinks, shareText } from '../src/lib/share.ts';

const url = 'https://jhermesn.dev/redocted/?c=aws&p=12';
const solved = {
  corpus: 'aws' as const,
  puzzle: 12,
  state: { guesses: Array.from({ length: 34 }, (_, i) => `w${i}`), hints: ['bucket', 'policy'], solved: true, gaveUp: false },
  accuracyRatio: 0.8235,
  url,
};
const gaveUp = { ...solved, corpus: 'k8s' as const, puzzle: 3, state: { guesses: ['a'], hints: [], solved: false, gaveUp: true } };

describe('shareText', () => {
  it('given a solved game in English, formats corpus, number, a challenge, guesses, accuracy, hints and link', () => {
    expect(shareText(solved, getMessages('en'))).toBe(
      [
        'Redocted AWS #12 ✅',
        'I uncovered a redacted AWS docs page. Can you beat my score?',
        '🔎 34 guesses · 🎯 82% accuracy · 💡 2 hints',
        url,
      ].join('\n'),
    );
  });

  it('given pt-br, localizes the message and the stats line', () => {
    const [, message, stats] = shareText(solved, getMessages('pt-br')).split('\n');
    expect(message).toBe('Desvendei uma página tarjada da documentação AWS. Consegue fazer melhor?');
    expect(stats).toBe('🔎 34 palpites · 🎯 82% precisão · 💡 2 dicas');
  });

  it('given a game given up, shows the white flag and a different message', () => {
    const [header, message] = shareText(gaveUp, getMessages('en')).split('\n');
    expect(header).toBe('Redocted Kubernetes #3 🏳️');
    expect(message).toBe('This redacted Kubernetes docs page beat me. Can you crack it?');
  });
});

describe('shareLinks', () => {
  const links = shareLinks(solved, getMessages('en'));
  const hrefOf = (network: string) => new URL(links.find((link) => link.network === network)?.href ?? '');

  it('given a result, links every network over HTTPS', () => {
    expect(links.map((link) => link.network)).toEqual(['X', 'Bluesky', 'LinkedIn', 'WhatsApp', 'Telegram']);
    expect(links.every((link) => link.href.startsWith('https://'))).toBe(true);
  });

  it('given X, prefills the full share text with the link', () => {
    expect(hrefOf('X').searchParams.get('text')).toBe(shareText(solved, getMessages('en')));
  });

  it('given Telegram, passes the link apart from the text', () => {
    const href = hrefOf('Telegram');
    expect(href.searchParams.get('url')).toBe(url);
    expect(href.searchParams.get('text')).not.toContain(url);
  });

  it('given spaces in the text, encodes them as %20 instead of +', () => {
    expect(hrefOf('WhatsApp').search).not.toContain('+');
  });
});
