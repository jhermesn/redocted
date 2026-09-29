import { parseHTML } from 'linkedom';
import { tokenize } from '../../src/lib/normalize.ts';
import type { Block, BlockKind, CorpusId } from '../../src/lib/types.ts';

export const MAX_BODY_WORDS = 700;

export interface ExtractedArticle {
  title: string;
  blocks: Block[];
}

interface SiteLayout {
  contentRoot: string;
  title: (page: Document) => string | null | undefined;
  // Site furniture inside the content root: banners, callout labels, in-page
  // navigation, code samples, feedback widgets. Removed before reading prose.
  chrome: readonly string[];
}

const SITE_LAYOUTS: Record<CorpusId, SiteLayout> = {
  aws: {
    contentRoot: '#main-col-body',
    title: (page) => page.querySelector('meta[name="product"]')?.getAttribute('content'),
    chrome: [
      'h1',
      'awsdocs-language-banner',
      '.awsdocs-page-banner',
      '.awsdocs-page-header-container',
      '.awsdocs-note-title',
      '.highlights',
      'awsdocs-tabs',
      'awsdocs-copyright',
      'awsdocs-thumb-feedback',
    ],
  },
  k8s: {
    contentRoot: 'main .td-content',
    title: (page) => page.querySelector('main .td-content h1')?.textContent,
    chrome: [
      'h1',
      'header',
      '.alert-heading',
      '.feature-state-notice',
      '.third-party-content',
      '.highlight',
      '.section-index',
      '#pre-footer',
      '.td-page-meta__lastmod',
    ],
  },
};

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

const HEADINGS: Record<string, BlockKind> = { h2: 'h2', h3: 'h3', h4: 'h3', h5: 'h3', h6: 'h3' };
const TEXT_BLOCKS = new Set(['p', 'dt']);
const IGNORED = new Set(['script', 'style', 'noscript', 'template', 'pre', 'table', 'img', 'svg', 'figure', 'button', 'form', 'iframe', 'video', 'audio']);
const INLINE = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'ins', 'kbd', 'label', 'mark',
  'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
]);

export function extractArticle(corpus: CorpusId, html: string, maxBodyWords = MAX_BODY_WORDS): ExtractedArticle {
  const layout = SITE_LAYOUTS[corpus];
  const page = parseHTML(html).document;
  const root = page.querySelector(layout.contentRoot);
  if (!root) throw new Error(`${corpus} page has no content root ${layout.contentRoot}`);
  const title = clean(layout.title(page) ?? '');
  if (!title) throw new Error(`${corpus} page has no title`);

  for (const selector of layout.chrome) root.querySelectorAll(selector).forEach((element) => element.remove());

  const body: Block[] = [];
  let words = 0;
  for (const block of collectBlocks(root)) {
    if (words >= maxBodyWords) break;
    body.push(block);
    words += tokenize(block.text).filter((token) => token.isWord).length;
  }
  return { title, blocks: [{ kind: 'h1', text: title }, ...withoutEmptySections(body)] };
}

const HEADING_RANK: Partial<Record<BlockKind, number>> = { h2: 2, h3: 3 };

// A heading followed by a heading of the same or higher rank (or by nothing)
// introduced only content that was dropped, such as a table or a code sample.
// Walks backwards so a heading is judged by the next block that was kept.
function withoutEmptySections(blocks: readonly Block[]): Block[] {
  const kept: Block[] = [];
  for (const block of [...blocks].reverse()) {
    const rank = HEADING_RANK[block.kind];
    const nextRank = kept.length > 0 ? (HEADING_RANK[kept[0].kind] ?? Infinity) : 0;
    if (rank === undefined || nextRank > rank) kept.unshift(block);
  }
  return kept;
}

// Mirrors how browsers lay out mixed content: runs of inline nodes between
// block elements form their own paragraph.
function collectBlocks(container: Element): Block[] {
  const blocks: Block[] = [];
  let inlineRun: ChildNode[] = [];
  const flush = () => {
    const text = clean(inlineRun.map(inlineText).join(''));
    if (text) blocks.push({ kind: 'p', text });
    inlineRun = [];
  };
  for (const node of container.childNodes) {
    if (node.nodeType === COMMENT_NODE) continue;
    if (isInline(node)) {
      inlineRun.push(node);
      continue;
    }
    flush();
    if (node.nodeType === ELEMENT_NODE) blocks.push(...blocksFrom(node as Element));
  }
  flush();
  return blocks;
}

function blocksFrom(element: Element): Block[] {
  const tag = element.tagName.toLowerCase();
  if (IGNORED.has(tag)) return [];
  if (Object.hasOwn(HEADINGS, tag)) return textBlock(HEADINGS[tag], element);
  if (TEXT_BLOCKS.has(tag)) return textBlock('p', element);
  if (tag === 'li') return listItem(element);
  return collectBlocks(element);
}

function listItem(item: Element): Block[] {
  const inner = collectBlocks(item);
  const own = inner.filter((block) => block.kind !== 'li');
  const nested = inner.filter((block) => block.kind === 'li');
  const text = own.map((block) => block.text).join(' ');
  return text ? [{ kind: 'li', text }, ...nested] : nested;
}

function textBlock(kind: BlockKind, element: Element): Block[] {
  const text = clean(element.textContent ?? '');
  return text ? [{ kind, text }] : [];
}

function isInline(node: ChildNode): boolean {
  if (node.nodeType === TEXT_NODE) return true;
  return node.nodeType === ELEMENT_NODE && INLINE.has((node as Element).tagName.toLowerCase());
}

function inlineText(node: ChildNode): string {
  return node.nodeType === ELEMENT_NODE && (node as Element).tagName.toLowerCase() === 'br' ? ' ' : (node.textContent ?? '');
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
