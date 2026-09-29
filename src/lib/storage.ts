import * as v from 'valibot';
import { EMPTY_STATE, type GameState } from './game.ts';
import type { CorpusId } from './types.ts';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Stats {
  played: number;
  won: number;
  streak: number;
  maxStreak: number;
  lastWonPuzzle: number | null;
}

// A saved game belongs to one article: if a puzzle number ever maps to a
// different article, the old progress must not leak onto it.
export interface GameSlot {
  corpus: CorpusId;
  puzzle: number;
  articleId: string;
}

export interface Settings {
  showLetterCounts: boolean;
}

const GameStateSchema = v.object({ guesses: v.array(v.string()), solved: v.boolean(), gaveUp: v.boolean() });
const CountSchema = v.pipe(v.number(), v.integer(), v.minValue(0));
const StatsSchema = v.object({
  played: CountSchema,
  won: CountSchema,
  streak: CountSchema,
  maxStreak: CountSchema,
  lastWonPuzzle: v.nullable(v.pipe(v.number(), v.integer())),
});
const SettingsSchema = v.object({ showLetterCounts: v.boolean() });

const PREFIX = 'redocted:v1';
const SETTINGS_KEY = `${PREFIX}:settings`;

export const EMPTY_STATS: Stats = { played: 0, won: 0, streak: 0, maxStreak: 0, lastWonPuzzle: null };
export const DEFAULT_SETTINGS: Settings = { showLetterCounts: false };

export function loadState(store: KeyValueStore | null, slot: GameSlot): GameState {
  return readValid(store, gameKey(slot), GameStateSchema) ?? EMPTY_STATE;
}

export function saveState(store: KeyValueStore | null, slot: GameSlot, state: GameState): void {
  writeJson(store, gameKey(slot), state);
}

export function loadStats(store: KeyValueStore | null, corpus: CorpusId): Stats {
  return readValid(store, statsKey(corpus), StatsSchema) ?? EMPTY_STATS;
}

export function saveStats(store: KeyValueStore | null, corpus: CorpusId, stats: Stats): void {
  writeJson(store, statsKey(corpus), stats);
}

export function recordResult(stats: Stats, puzzle: number, won: boolean): Stats {
  if (!won) return { ...stats, played: stats.played + 1, streak: 0 };
  const streak = stats.lastWonPuzzle === puzzle - 1 ? stats.streak + 1 : 1;
  return {
    played: stats.played + 1,
    won: stats.won + 1,
    streak,
    maxStreak: Math.max(stats.maxStreak, streak),
    lastWonPuzzle: puzzle,
  };
}

// Only today's puzzle feeds stats and streaks, once, at the moment it ends.
export function countsTowardStats(previous: GameState, next: GameState, { puzzle, today }: { puzzle: number; today: number }): boolean {
  const ended = (state: GameState) => state.solved || state.gaveUp;
  return puzzle === today && !ended(previous) && ended(next);
}

// A streak only survives while the last win is today's or yesterday's puzzle.
export function currentStreak(stats: Stats, today: number): number {
  const lastWon = stats.lastWonPuzzle;
  return lastWon !== null && today - lastWon <= 1 ? stats.streak : 0;
}

export function loadSettings(store: KeyValueStore | null): Settings {
  return readValid(store, SETTINGS_KEY, SettingsSchema) ?? DEFAULT_SETTINGS;
}

export function saveSettings(store: KeyValueStore | null, settings: Settings): void {
  writeJson(store, SETTINGS_KEY, settings);
}

function gameKey({ corpus, puzzle, articleId }: GameSlot): string {
  return `${PREFIX}:${corpus}:game:${puzzle}:${articleId}`;
}

function statsKey(corpus: CorpusId): string {
  return `${PREFIX}:${corpus}:stats`;
}

// Storage is a convenience: private mode, quota errors and corrupted values
// must degrade to a fresh game instead of breaking the page.
function readValid<T>(store: KeyValueStore | null, key: string, schema: v.GenericSchema<unknown, T>): T | null {
  try {
    const raw = store?.getItem(key);
    if (!raw) return null;
    const result = v.safeParse(schema, JSON.parse(raw));
    return result.success ? result.output : null;
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore | null, key: string, value: unknown): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // See readValid: persistence failures are intentionally non-fatal.
  }
}
