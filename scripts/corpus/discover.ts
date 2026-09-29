import { DOMParser, parseHTML } from 'linkedom';
import type { SourcePage } from './source.ts';

export interface GuideRoot {
  id: string;
  rootUrl: string;
}

// Only English guides match: localized copies live under an extra locale
// segment such as /zh_cn/.
const AWS_GUIDE_SITEMAP = /^https:\/\/docs\.aws\.amazon\.com\/([A-Za-z0-9-]+)\/latest\/([A-Za-z]+)\/sitemap\.xml$/;
const GUIDE_PREFERENCE = ['userguide', 'ug', 'dg', 'devguide', 'developerguide'];
const K8S_CONCEPTS = 'https://kubernetes.io/docs/concepts/';

export function awsGuideRoots(sitemapIndexXml: string): GuideRoot[] {
  const best = new Map<string, { rank: number; rootUrl: string }>();
  for (const url of sitemapLocations(sitemapIndexXml)) {
    const match = AWS_GUIDE_SITEMAP.exec(url);
    if (!match) continue;
    const [, service, guide] = match;
    const rank = GUIDE_PREFERENCE.indexOf(guide.toLowerCase());
    if (rank === -1) continue;
    const id = service.toLowerCase();
    const current = best.get(id);
    if (!current || rank < current.rank) best.set(id, { rank, rootUrl: url.replace(/sitemap\.xml$/, '') });
  }
  return [...best]
    .map(([id, { rootUrl }]) => ({ id, rootUrl }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export interface FetchedPage {
  url: string;
  html: string;
}

// A guide root sends readers to the guide's landing ("What is ...?") page
// either with an HTTP redirect or with a refresh stub; both are followed.
export function awsLandingUrl(rootUrl: string, root: FetchedPage): string {
  return sameSite(rootUrl, root.url !== rootUrl ? root.url : refreshTarget(rootUrl, root.html));
}

function refreshTarget(rootUrl: string, html: string): string {
  const refresh = [...parseHTML(html).document.querySelectorAll('meta')].find(
    (meta) => meta.getAttribute('http-equiv')?.toLowerCase() === 'refresh',
  );
  const target = /url=(.+)$/i.exec(refresh?.getAttribute('content') ?? '')?.[1];
  if (!target) throw new Error(`${rootUrl} has no landing redirect`);
  return new URL(target.trim(), rootUrl).href;
}

function sameSite(rootUrl: string, landingUrl: string): string {
  if (new URL(landingUrl).origin !== new URL(rootUrl).origin) throw new Error(`${rootUrl} redirect leaves the site: ${landingUrl}`);
  return landingUrl;
}

export function k8sConceptPages(sitemapXml: string): SourcePage[] {
  return sitemapLocations(sitemapXml)
    .filter((url) => url.startsWith(K8S_CONCEPTS) && url !== K8S_CONCEPTS)
    .map((docsUrl) => ({ id: docsUrl.slice(K8S_CONCEPTS.length).replace(/\/+$/, '').replaceAll('/', '-'), docsUrl }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function sitemapLocations(xml: string): string[] {
  const document = new DOMParser().parseFromString(xml, 'text/xml');
  return [...document.querySelectorAll('loc')].map((loc) => (loc.textContent ?? '').trim());
}
