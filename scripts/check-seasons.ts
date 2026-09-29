import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { CORPORA } from '../src/lib/corpora.ts';
import { currentPuzzle } from '../src/lib/daily.ts';
import type { CorpusIndex } from '../src/lib/types.ts';
import { bundleChangeProblems, seasonChangeProblems } from './corpus/seasons.ts';

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function indexAt(ref: string, path: string): CorpusIndex | null {
  try {
    execFileSync('git', ['cat-file', '-e', `${ref}:${path}`], { stdio: 'ignore' });
  } catch {
    return null;
  }
  return JSON.parse(git('show', `${ref}:${path}`)) as CorpusIndex;
}

function changedBundleKeys(ref: string, dir: string): string[] {
  return git('diff', '--name-only', ref, '--', dir)
    .split('\n')
    .filter((path) => path.endsWith('.json') && basename(path) !== 'index.json')
    .map((path) => basename(path, '.json'));
}

const baseRef = process.argv[2];
if (!baseRef) throw new Error('usage: npm run check:seasons -- <base git ref>');
git('rev-parse', '--verify', `${baseRef}^{commit}`);

// The same day the browser plays: before launch, puzzle 1 is already live.
const today = currentPuzzle(new Date());
const problems: string[] = [];
for (const corpus of CORPORA) {
  const dir = `public/corpus/${corpus}`;
  const before = indexAt(baseRef, `${dir}/index.json`);
  const after = JSON.parse(await readFile(`${dir}/index.json`, 'utf8')) as CorpusIndex;
  problems.push(...seasonChangeProblems(before, after, today), ...bundleChangeProblems(before, changedBundleKeys(baseRef, dir), today));
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Seasons and live articles unchanged against ${baseRef} (today is puzzle ${today}).`);
