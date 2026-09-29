# Contributing

Issues and pull requests are welcome.

## Good first contributions

- **Better article extraction.** Articles are discovered automatically (see
  the README). If a documentation site changes its layout, the builder stops
  with an error; the fix is a selector in `SITE_LAYOUTS` in
  `scripts/corpus/extract.ts`, never a per-page exception.
- **Running the corpus builder yourself.** `npm run corpus` discovers new
  pages, builds their articles and appends them to the next season in
  `corpus/sources/`. Commit `corpus/sources/` and `public/corpus/` together.
  Published articles are never re-fetched; `npm run corpus -- --refresh`
  rebuilds only the articles of seasons that have not started yet.
  `npm run corpus -- aws` limits a run to one board.
- **A new interface language.**
  1. Add `src/i18n/<locale>.ts`, typed as `Messages`.
  2. Register it in `src/i18n/index.ts` (`Locale`, `LOCALES`, `DICTIONARIES`,
     `HTML_LANG`, `OG_LOCALE`) and in `i18n.locales` in `astro.config.mjs`.
  3. Add `src/pages/<locale>/index.astro` (a copy of `src/pages/pt-br/index.astro`).

  `npm run typecheck` and `npm test` point at anything missing.
- **An article that came out wrong** (banner text, code, a strange title).
  Open an issue with the board, the puzzle number and what looks wrong. The fix
  usually belongs in the site layout in `scripts/corpus/extract.ts`, never in a
  per-page exception.

## Repository layout

```
corpus/sources/        pages per board, grouped into seasons (generated)
public/corpus/         generated articles and indexes, committed
scripts/               corpus builder: discovery, extraction, lemmas, quality
                       checks, season rules, and the CI season guard
src/lib/               game logic: daily pick, words, rendering, storage
src/i18n/              interface text per language (en is the source of truth)
src/components/        page markup
src/scripts/app.ts     browser glue, the only code that touches the DOM
tests/                 unit tests (Vitest)
```

## Checks on your PR

CI runs on every pull request, with actions pinned by commit SHA in
`.github/workflows/ci.yml`: `npm ci`, `npm test`, `npm run typecheck`,
`npm run build`, and `npm run check:seasons`, which fails when a pull request
changes a season that has already started, rewrites one of its articles, or
adds a season that starts in the past. The deploy workflow runs the same check
again, because a pull request can be merged after its season was due to
start. The test suite also validates every committed article (schema, source
host, license, and the same quality checks the builder applies).

The monthly `corpus` workflow opens its pull request with the repository's
`GITHUB_TOKEN`, which needs **Settings → Actions → General → Allow GitHub
Actions to create and approve pull requests**.

## Releases

Releases are automatic. After each merge to `main`,
[release-please](https://github.com/googleapis/release-please) updates a
release pull request with the next version, worked out from the commit
messages, and the changelog. Merging that pull request tags the version,
publishes the GitHub release and bumps `package.json`. Every merge to `main`
also deploys the site to GitHub Pages.

| Commit type | Next version (while below 1.0) |
|---|---|
| `fix:` | patch, e.g. 0.5.0 → 0.5.1 |
| `feat:` | minor, e.g. 0.5.0 → 0.6.0 |
| `feat!:` or `BREAKING CHANGE:` | minor, e.g. 0.5.0 → 0.6.0 |
| `docs:`, `test:`, `ci:`, `chore:`, `refactor:` | no release on their own |

Never edit the version in `package.json` by hand.

## Conventions

- Code, comments, file names and commit messages in English. Interface text
  lives only in `src/i18n/`.
- No per-page overrides or fallbacks in the corpus builder: read what the
  documentation site publishes, and fail loudly when it changes.
- Prefer a maintained library, a web platform API or an Astro feature over
  hand-written code for anything generic.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
