import { describe, expect, it } from 'vitest';
import { extractArticle } from '../scripts/corpus/extract.ts';

const AWS_PAGE = `<html><head><meta name="product" content="AWS CloudTrail"></head><body>
<div id="main-col-body"><awsdocs-language-banner></awsdocs-language-banner>
<awsui-alert class="awsdocs-page-banner"><p>Help improve this page</p></awsui-alert>
<h1 class="topictitle">What Is AWS CloudTrail?</h1>
<div class="awsdocs-page-header-container"><awsdocs-page-header></awsdocs-page-header></div>
<div class="awsdocs-note awsdocs-tip"><div class="awsdocs-note-title"><awsui-icon></awsui-icon><h6>Tip</h6></div>
<div class="awsdocs-note-text"><p>Try the <a href="#">workshop</a>.</p></div></div>
<p>AWS CloudTrail records <b>events</b> &amp; activity.</p>
<div class="itemizedlist"><ul class="itemizedlist"><li class="listitem"><p><b>Event history</b> – recent events.</p>
<div class="itemizedlist"><ul><li><p>Nested item</p></li></ul></div></li></ul></div>
<div id="inline-topiclist" class="highlights"><h6>Topics</h6><ul><li><a href="#">CloudTrail console</a></li></ul></div>
<h2 id="accessing">Accessing CloudTrail</h2>
<awsdocs-tabs><dl><dt>CLI</dt><dd><pre class="programlisting"><code>aws cloudtrail</code></pre></dd></dl></awsdocs-tabs>
<pre class="programlisting"><code>aws cloudtrail lookup-events</code></pre>
<div class="table-container"><table><tr><td>cell</td></tr></table></div>
<h3>AWS CLI</h3><p>Use the CLI.</p>
<awsdocs-copyright class="copyright-print"></awsdocs-copyright>
</div></body></html>`;

const K8S_PAGE = `<html><body><main><nav class="td-breadcrumbs"><ol><li>Kubernetes Documentation</li></ol></nav>
<div class="td-content"><h1>Pods</h1><header class="article-meta"></header>
<p>Pods are the smallest deployable units.</p>
<div class="alert alert-info"><h4 class="alert-heading">Note:</h4>You need a <a href="#">container runtime</a> on each node.</div>
<div class="feature-state-notice feature-stable"><span>FEATURE STATE:</span> <code>Kubernetes v1.34 [stable]</code></div>
<div class="alert alert-secondary callout third-party-content" role="alert">🛇 This item links to a third party project or product that is not part of Kubernetes itself. <a href="#">More information</a></div>
<h2 id="using-pods">Using Pods</h2>
<div class="highlight"><pre><code>kubectl apply</code></pre></div>
<h4 id="default">Default pull policy</h4>
<dl><dt>IfNotPresent</dt><dd>pulled only if absent</dd></dl>
<div class="section-index"></div>
<div id="pre-footer"><h2>Feedback</h2><p>Was this page helpful?</p></div>
<div class="td-page-meta__lastmod">Last modified July 18</div>
</div></main></body></html>`;

describe('extractArticle', () => {
  it('given an AWS page, takes the product name as title and keeps prose, headings and list items only', () => {
    expect(extractArticle('aws', AWS_PAGE)).toEqual({
      title: 'AWS CloudTrail',
      blocks: [
        { kind: 'h1', text: 'AWS CloudTrail' },
        { kind: 'p', text: 'Try the workshop.' },
        { kind: 'p', text: 'AWS CloudTrail records events & activity.' },
        { kind: 'li', text: 'Event history – recent events.' },
        { kind: 'li', text: 'Nested item' },
        { kind: 'h2', text: 'Accessing CloudTrail' },
        { kind: 'h3', text: 'AWS CLI' },
        { kind: 'p', text: 'Use the CLI.' },
      ],
    });
  });

  it('given a Kubernetes page, takes the page heading as title and drops notices, code and feedback chrome', () => {
    expect(extractArticle('k8s', K8S_PAGE)).toEqual({
      title: 'Pods',
      blocks: [
        { kind: 'h1', text: 'Pods' },
        { kind: 'p', text: 'Pods are the smallest deployable units.' },
        { kind: 'p', text: 'You need a container runtime on each node.' },
        { kind: 'h2', text: 'Using Pods' },
        { kind: 'h3', text: 'Default pull policy' },
        { kind: 'p', text: 'IfNotPresent' },
        { kind: 'p', text: 'pulled only if absent' },
      ],
    });
  });

  it('given a word cap, stops at the first block boundary past the cap', () => {
    const page = '<meta name="product" content="T"><div id="main-col-body"><p>one two three</p><p>four five six</p><p>seven eight nine</p></div>';
    expect(extractArticle('aws', page, 5).blocks).toEqual([
      { kind: 'h1', text: 'T' },
      { kind: 'p', text: 'one two three' },
      { kind: 'p', text: 'four five six' },
    ]);
  });

  it('given headings whose sections had only tables or code, drops the empty headings', () => {
    const page =
      '<meta name="product" content="T"><div id="main-col-body">' +
      '<h2>Pricing</h2><table><tr><td>x</td></tr></table>' +
      '<h2>Concepts</h2><h3>Buckets</h3><p>Buckets hold objects.</p>' +
      '<h3>Examples</h3><pre>code</pre></div>';
    expect(extractArticle('aws', page).blocks).toEqual([
      { kind: 'h1', text: 'T' },
      { kind: 'h2', text: 'Concepts' },
      { kind: 'h3', text: 'Buckets' },
      { kind: 'p', text: 'Buckets hold objects.' },
    ]);
  });

  it('given a section whose only subsection is empty, drops both headings', () => {
    const page = '<meta name="product" content="T"><div id="main-col-body"><h2>Setup</h2><h3>Commands</h3><pre>x</pre><h2>Usage</h2><p>Run it.</p></div>';
    expect(extractArticle('aws', page).blocks).toEqual([
      { kind: 'h1', text: 'T' },
      { kind: 'h2', text: 'Usage' },
      { kind: 'p', text: 'Run it.' },
    ]);
  });

  it('given a page without the site title markup, throws', () => {
    expect(() => extractArticle('aws', '<div id="main-col-body"><p>x</p></div>')).toThrow('title');
  });

  it('given a page without the site content root, throws', () => {
    expect(() => extractArticle('k8s', '<main><h1>Pods</h1></main>')).toThrow('content');
  });
});
