// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import pkg from './package.json' with { type: 'json' };
import { DEFAULT_LOCALE, HTML_LANG, LOCALES } from './src/i18n/index.ts';

// package.json `homepage` is the single source for where the site is served.
const homepage = new URL(pkg.homepage);

export default defineConfig({
  site: homepage.origin,
  base: homepage.pathname.replace(/\/$/, ''),
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'always' },
  // Monospace keeps every redaction bar exactly as wide as its word.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'IBM Plex Mono',
      cssVariable: '--font-plex-mono',
      weights: [400, 700],
      styles: ['normal'],
      subsets: ['latin'],
    },
  ],
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap({ i18n: { defaultLocale: DEFAULT_LOCALE, locales: HTML_LANG } })],
  vite: { plugins: [tailwindcss()] },
});
